import React from 'react';
import { useSafetyMetrics } from '@/hooks/useSafetyMetrics';
import SafetyMetrics from '@/components/SafetyMetrics';

interface SafetyMetricsExampleProps {
  latitude: number;
  longitude: number;
  city?: string;
}

/**
 * Example component showing how to use the Safety Metrics feature
 */
const SafetyMetricsExample: React.FC<SafetyMetricsExampleProps> = ({
  latitude,
  longitude,
  city = 'Los Angeles'
}) => {
  // Use our custom hook to fetch safety metrics
  const { data: safetyMetrics, isLoading, error, refetch } = useSafetyMetrics(
    latitude,
    longitude,
    { city }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Safety Information</h2>
        <button 
          onClick={() => refetch()}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                    disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          Error loading safety metrics: {error.message}
        </div>
      )}
      
      {/* Use our SafetyMetrics component to display the data */}
      <SafetyMetrics 
        districtMetrics={safetyMetrics} 
        isLoading={isLoading} 
      />
      
      <div className="text-sm text-gray-500 mt-2">
        <p>
          Safety metrics are based on official police data and provide an assessment
          of the general safety level in this district. Individual experiences may vary.
        </p>
      </div>
    </div>
  );
};

export default SafetyMetricsExample; 