import { DistrictSafetyMetrics } from './types';

/**
 * Client-side function to fetch safety metrics for a location
 */
export async function fetchSafetyMetrics(
  latitude: number,
  longitude: number,
  city: string = 'Los Angeles'
): Promise<DistrictSafetyMetrics | null> {
  try {
    const response = await fetch(
      `/api/safety-metrics?latitude=${latitude}&longitude=${longitude}&city=${encodeURIComponent(city)}`
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error fetching safety metrics:', errorData.message);
      return null;
    }
    
    const data = await response.json();
    return data.success ? data.metrics : null;
  } catch (error) {
    console.error('Error fetching safety metrics:', error);
    return null;
  }
} 