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
  const isAdmin = user?.email?.endsWith('@trustplace.vercel.app');

  const checkStatus = async () => {
    try {
      setIsLoading(true);
      const session = await supabase.auth.getSession();
      const response = await fetch('/api/admin/safety-metrics/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const data = await response.json();
      setMetricsStatus(data);
      setIsError(false);
      setStatusMessage(null);
    } catch (error) {
      setIsError(true);
      setStatusMessage('Failed to fetch status');
      console.error('Error checking status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerUpdate = async () => {
    try {
      setIsLoading(true);
      const session = await supabase.auth.getSession();
      const response = await fetch('/api/admin/safety-metrics/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to trigger update');
      }

      setIsError(false);
      setStatusMessage('Update triggered successfully');
      // Refresh status after update
      await checkStatus();
    } catch (error) {
      setIsError(true);
      setStatusMessage('Failed to trigger update');
      console.error('Error triggering update:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
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
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Safety Metrics Admin</CardTitle>
          <CardDescription>
            Manage and update safety metrics for all listings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusMessage && (
            <Alert
              variant={isError ? "destructive" : "default"}
              className="mb-4"
            >
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}

          {metricsStatus && (
            <div className="space-y-4">
              <Alert
                variant={metricsStatus.needsUpdate ? "destructive" : "default"}
              >
                <div className="flex items-center gap-2">
                  {metricsStatus.needsUpdate ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {metricsStatus.initialized
                      ? `Last updated ${metricsStatus.lastUpdated}`
                      : "Not initialized"}
                  </AlertTitle>
                </div>
                {metricsStatus.daysSinceUpdate !== undefined && (
                  <AlertDescription>
                    {metricsStatus.daysSinceUpdate} days since last update
                  </AlertDescription>
                )}
              </Alert>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={checkStatus}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Check Status
          </Button>
          <Button
            onClick={triggerUpdate}
            disabled={isLoading}
          >
            Update Metrics
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 