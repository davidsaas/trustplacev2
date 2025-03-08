import { createClient } from '@supabase/supabase-js';

// Types for safety metrics
export interface SafetyMetric {
  title: string;
  score: number;
  description: string;
  raw_count?: number;
}

export interface SafetyMetrics {
  night_safety: SafetyMetric;
  vehicle_safety: SafetyMetric;
  child_safety: SafetyMetric;
  transit_safety: SafetyMetric;
  womens_safety: SafetyMetric;
}

export interface DistrictSafetyMetrics {
  id: string;
  district: string;
  city: string;
  metrics: SafetyMetrics;
  last_updated: string;
  latitude: number | null;
  longitude: number | null;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get safety metrics for a specific district and city
 */
export const getDistrictSafetyMetrics = async (district: string, city: string): Promise<DistrictSafetyMetrics | null> => {
  try {
    const { data, error } = await supabase
      .from('safety_metrics')
      .select('*')
      .eq('district', district)
      .eq('city', city)
      .single();

    if (error) {
      console.error('Error fetching district safety metrics:', error);
      return null;
    }

    return data as DistrictSafetyMetrics;
  } catch (error) {
    console.error('Failed to fetch district safety metrics:', error);
    return null;
  }
};

/**
 * Get safety metrics for all districts in a city
 */
export const getCitySafetyMetrics = async (city: string): Promise<DistrictSafetyMetrics[]> => {
  try {
    const { data, error } = await supabase
      .from('safety_metrics')
      .select('*')
      .eq('city', city)
      .order('district');

    if (error) {
      console.error('Error fetching city safety metrics:', error);
      return [];
    }

    return data as DistrictSafetyMetrics[];
  } catch (error) {
    console.error('Failed to fetch city safety metrics:', error);
    return [];
  }
};

/**
 * Find the nearest district to the given coordinates and return its safety metrics
 */
export const getNearestDistrictSafetyMetrics = async (
  latitude: number,
  longitude: number,
  city: string = 'Los Angeles'
): Promise<DistrictSafetyMetrics | null> => {
  try {
    const { data, error } = await supabase.rpc('find_la_district', {
      lat: latitude,
      lng: longitude
    });

    if (error || !data) {
      console.error('Error finding nearest district:', error);
      return null;
    }

    // Now fetch the safety metrics for this district
    return await getDistrictSafetyMetrics(data.district, city);
  } catch (error) {
    console.error('Failed to get nearest district safety metrics:', error);
    return null;
  }
};

/**
 * Get safety score color based on the score value
 * Returns a Tailwind CSS color class
 */
export const getSafetyScoreColor = (score: number): string => {
  if (score >= 8) return 'text-green-500';
  if (score >= 6) return 'text-emerald-500';
  if (score >= 5) return 'text-yellow-500';
  if (score >= 3) return 'text-orange-500';
  return 'text-red-500';
};

/**
 * Helper function to determine if safety metrics data is stale (older than 35 days)
 */
export const isSafetyDataStale = (lastUpdated: string): boolean => {
  const lastUpdatedDate = new Date(lastUpdated);
  const currentDate = new Date();
  
  // Calculate difference in days
  const diffTime = currentDate.getTime() - lastUpdatedDate.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24);
  
  return diffDays > 35; // Consider data stale if older than 35 days
}; 