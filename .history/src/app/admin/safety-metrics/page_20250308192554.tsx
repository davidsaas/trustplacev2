'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, AlertTriangle, RefreshCw } from 'lucide-react';

export default function SafetyMetricsAdmin() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<null | string>(null);
  const [isError, setIsError] = useState(false);
  const [metricsStatus, setMetricsStatus] = useState<null | {
    initialized: boolean;
    lastUpdated?: string;
    daysSinceUpdate?: number;
    needsUpdate?: boolean;
  }>(null);

  // Check if the user is authenticated and is an admin
  const isAdmin = user?.role === 'admin';

  // Fetch the current status of the safety metrics
  const checkStatus = async () => {
    try {
      const response = await fetch('/api/safety-metrics/update');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check status');
      }
      
      setMetricsStatus(data);
    } catch (error) {
      console.error('Error checking metrics status:', error);
      setMetricsStatus(null);
    }
  };

  // Trigger the safety metrics update
  const triggerUpdate = async () => {
    if (!isAdmin) return;
    
    setIsLoading(true);
    setStatusMessage(null);
    setIsError(false);
    
    try {
      const response = await fetch('/api/safety-metrics/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update safety metrics');
      }
      
      setStatusMessage(data.message || 'Safety metrics update completed successfully');
      // Refresh the status after a successful update
      await checkStatus();
    } catch (error) {
      console.error('Error updating safety metrics:', error);
      setIsError(true);
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Check the status when the component mounts
  useState(() => {
    checkStatus();
  });

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Safety Metrics Administration</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Safety Metrics Status</CardTitle>
            <CardDescription>
              Check the current status of safety metrics in the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metricsStatus ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  <span className={`font-bold ${metricsStatus.initialized ? 'text-green-500' : 'text-amber-500'}`}>
                    {metricsStatus.initialized ? 'Initialized' : 'Not Initialized'}
                  </span>
                </div>
                
                {metricsStatus.initialized && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Last Updated:</span>
                      <span>{new Date(metricsStatus.lastUpdated!).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Days Since Update:</span>
                      <span 
                        className={metricsStatus.needsUpdate ? 'text-red-500 font-bold' : ''}
                      >
                        {metricsStatus.daysSinceUpdate}
                      </span>
                    </div>
                    
                    <Alert variant={metricsStatus.needsUpdate ? "destructive" : "default"}>
                      {metricsStatus.needsUpdate ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      <AlertTitle>
                        {metricsStatus.needsUpdate ? 'Update Needed' : 'Up to Date'}
                      </AlertTitle>
                      <AlertDescription>
                        {metricsStatus.needsUpdate 
                          ? 'Safety metrics data is older than 30 days and should be updated.'
                          : 'Safety metrics data is current and up to date.'}
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p>Loading status...</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={checkStatus} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Update Safety Metrics</CardTitle>
            <CardDescription>
              Manually trigger an update of safety metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              This will trigger the Python script to process LAPD crime data and update 
              the safety metrics for all districts in Los Angeles.
            </p>
            
            <div className="flex flex-col space-y-4">
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This process may take several minutes to complete. The page will remain
                  responsive, but the update will continue running in the background.
                </AlertDescription>
              </Alert>
              
              {statusMessage && (
                <Alert variant={isError ? "destructive" : "success"}>
                  {isError ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {isError ? 'Error' : 'Success'}
                  </AlertTitle>
                  <AlertDescription>
                    {statusMessage}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button 
              onClick={triggerUpdate} 
              disabled={isLoading}
              variant="default"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Update Safety Metrics'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 