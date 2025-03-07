import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, Info, Shield, MessageCircle } from 'lucide-react';
import { supabase } from "@/lib/supabase";

interface SafetyIncident {
  id: string;
  incident_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  date: string;
  location: string;
  source: string;
  verified: boolean;
  latitude: number;
  longitude: number;
}

interface SupabaseSafetyTakeawaysProps {
  latitude: number;
  longitude: number;
  radius?: number; // in miles
}

export default function SupabaseSafetyTakeaways({ latitude, longitude, radius = 1 }: SupabaseSafetyTakeawaysProps) {
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchSafetyData = async () => {
      if (!latitude || !longitude) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Calculate bounding box for the given radius
        // Approximate miles to degrees (very rough approximation)
        const milesInDegrees = radius / 69;
        
        const { data, error } = await supabase
          .from('safety_incidents')
          .select('*')
          .gte('latitude', latitude - milesInDegrees)
          .lte('latitude', latitude + milesInDegrees)
          .gte('longitude', longitude - milesInDegrees)
          .lte('longitude', longitude + milesInDegrees)
          .order('date', { ascending: false });
        
        if (error) throw error;
        
        setIncidents(data || []);
      } catch (err) {
        console.error('Error fetching safety data from Supabase:', err);
        setError('Failed to load safety data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSafetyData();
  }, [latitude, longitude, radius]);
  
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
        <p className="text-rose-700">{error}</p>
      </div>
    );
  }
  
  if (incidents.length === 0) {
    return (
      <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-50 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-800 mb-1">No Safety Incidents</h4>
            <p className="text-blue-700 text-sm">
              No reported safety incidents in our database for this location within {radius} mile{radius !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      </Card>
    );
  }
  
  // Count incidents by severity
  const highSeverity = incidents.filter(i => i.severity === 'high').length;
  const mediumSeverity = incidents.filter(i => i.severity === 'medium').length;
  const lowSeverity = incidents.filter(i => i.severity === 'low').length;
  
  // Count incidents by type
  const incidentTypes = incidents.reduce((acc, incident) => {
    acc[incident.incident_type] = (acc[incident.incident_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Get the most common incident types (top 2)
  const mostCommonTypes = Object.entries(incidentTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([type, count]) => ({ type, count }));
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Safety Takeaways - Always visible */}
      <div className="space-y-4">
        {highSeverity > 0 && (
          <Card className="p-4 border-l-4 border-l-rose-500 bg-rose-50 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-rose-800 mb-1">High Severity Incidents</h4>
                <p className="text-rose-700 text-sm">
                  {highSeverity} high severity incident{highSeverity !== 1 ? 's' : ''} reported in this area within the last {Math.round((Date.now() - new Date(incidents[incidents.length - 1].date).getTime()) / (1000 * 60 * 60 * 24 * 30))} months.
                </p>
              </div>
            </div>
          </Card>
        )}
        
        {mostCommonTypes.length > 0 && (
          <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-50 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-amber-800 mb-1">Common Incidents</h4>
                <p className="text-amber-700 text-sm">
                  Most common incident types in this area: {mostCommonTypes.map(t => `${t.type} (${t.count})`).join(', ')}.
                </p>
              </div>
            </div>
          </Card>
        )}
        
        <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-50 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-800 mb-1">Safety Summary</h4>
              <p className="text-blue-700 text-sm">
                {incidents.length} incident{incidents.length !== 1 ? 's' : ''} reported within {radius} mile{radius !== 1 ? 's' : ''} of this location. 
                {highSeverity > 0 ? ` ${highSeverity} high severity, ` : ' '}
                {mediumSeverity > 0 ? `${mediumSeverity} medium severity, ` : ''}
                {lowSeverity > 0 ? `${lowSeverity} low severity.` : ''}
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Button to toggle details */}
      <div className="flex justify-center">
        <Button 
          variant="outline" 
          className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
          onClick={() => setShowDetails(!showDetails)}
        >
          <MessageCircle className="h-4 w-4" />
          {showDetails ? "Hide Incident Details" : "See Incident Details"}
        </Button>
      </div>
      
      {/* Incident Details - Only visible when showDetails is true */}
      {showDetails && (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <div key={incident.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{incident.incident_type}</h4>
                  <p className="text-xs text-gray-500">{formatDate(incident.date)}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  incident.severity === 'high' 
                    ? 'bg-rose-100 text-rose-800' 
                    : incident.severity === 'medium'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                }`}>
                  {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)} Severity
                </div>
              </div>
              <p className="text-gray-700 mb-2">{incident.description}</p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{incident.location}</span>
                {incident.verified && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 