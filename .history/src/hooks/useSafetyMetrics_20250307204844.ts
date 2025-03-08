import { useState, useEffect } from 'react';
import { 
  DistrictSafetyMetrics, 
  getNearestDistrictSafetyMetrics 
} from '@/lib/safety-insights/safety-metrics';

interface UseSafetyMetricsOptions {
  enabled?: boolean;
  city?: string;
}

interface UseSafetyMetricsResult {
  data: DistrictSafetyMetrics | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * React hook to fetch safety metrics for a location
 */
export function useSafetyMetrics(
  latitude: number | null,
  longitude: number | null,
  options: UseSafetyMetricsOptions = {}
): UseSafetyMetricsResult {
  const { enabled = true, city = 'Los Angeles' } = options;
  
  const [data, setData] = useState<DistrictSafetyMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = async () => {
    if (!latitude || !longitude || !enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const metrics = await getNearestDistrictSafetyMetrics(latitude, longitude, city);
      setData(metrics);
    } catch (err) {
      console.error('Error fetching safety metrics:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch safety metrics'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch data on mount or when coordinates change
  useEffect(() => {
    fetchData();
  }, [latitude, longitude, city, enabled]);
  
  // Return data and status
  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  };
}

export default useSafetyMetrics; 