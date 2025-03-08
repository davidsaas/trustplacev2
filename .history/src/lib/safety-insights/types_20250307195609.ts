// Types for Safety Metrics feature
export interface SafetyScore {
  score: number; // 1-10 scale
  color: string; // Color code for visualization
}

export interface SafetyMetric {
  type: SafetyMetricType;
  title: string; // The user question (e.g., "Can I go outside after dark?")
  description: string; // Brief explanation of current safety status
  score: SafetyScore;
}

export enum SafetyMetricType {
  NIGHT_SAFETY = 'night_safety',
  VEHICLE_SAFETY = 'vehicle_safety',
  CHILD_SAFETY = 'child_safety',
  TRANSIT_SAFETY = 'transit_safety',
  WOMEN_SAFETY = 'women_safety',
}

export interface DistrictSafetyMetrics {
  district: string;
  city: string;
  metrics: SafetyMetric[];
  lastUpdated: string;
  latitude?: number;
  longitude?: number;
}

export interface PoliceIncident {
  id: string;
  date_reported: string;
  date_occurred: string;
  time_occurred?: string;
  area?: string;
  area_name?: string;
  crime_code: string;
  crime_description: string;
  location: {
    latitude: number;
    longitude: number;
  };
  district?: string;
  // Additional fields that may be present in the API response
  [key: string]: any;
}

export interface SafetyTakeaways {
  id?: string;
  latitude: number;
  longitude: number;
  radius: number;
  positive_takeaway: string | null;
  negative_takeaway: string | null;
  neutral_takeaway: string | null;
  created_at?: string;
  expires_at?: string;
} 