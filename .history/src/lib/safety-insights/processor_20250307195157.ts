import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import { resolve } from 'path';
import axios from 'axios';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in .env.local');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini AI for supplementary analysis when needed
const geminiKey = process.env.GEMINI_API_KEY;
if (!geminiKey) {
  throw new Error('Missing Gemini API key in .env.local');
}

const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

// Crime mapping configuration for each safety metric
interface CrimeMapping {
  codes: string[];
  weight: number;
}

// Crime mappings for LA
const LA_CRIME_MAPPINGS: Record<SafetyMetricType, CrimeMapping[]> = {
  [SafetyMetricType.NIGHT_SAFETY]: [
    { codes: ['624', '625', '626', '627', '210', '220'], weight: 1.0 }, // Robbery
    { codes: ['110', '113', '121', '122'], weight: 1.0 }, // Assault
    { codes: ['753', '755', '756', '761', '762'], weight: 0.7 }, // Threats
  ],
  [SafetyMetricType.VEHICLE_SAFETY]: [
    { codes: ['510', '520', '330', '331', '410', '420'], weight: 1.0 }, // Vehicle theft
    { codes: ['330', '331', '440', '441'], weight: 0.8 }, // Burglary from vehicle
    { codes: ['480', '485', '487'], weight: 0.5 }, // Vandalism to vehicle
  ],
  [SafetyMetricType.CHILD_SAFETY]: [
    { codes: ['235', '236', '237'], weight: 1.0 }, // Child abuse
    { codes: ['810', '812', '813', '814', '815'], weight: 1.0 }, // Offenses against family/child
    { codes: ['920', '921', '922'], weight: 0.8 }, // Kidnapping
  ],
  [SafetyMetricType.TRANSIT_SAFETY]: [
    { codes: ['210', '220', '224'], weight: 0.8 }, // Robbery near transit
    { codes: ['625', '626', '627'], weight: 0.8 }, // Public transit related crime
    { codes: ['860', '865', '870', '880'], weight: 0.5 }, // Disturbance in public areas
  ],
  [SafetyMetricType.WOMEN_SAFETY]: [
    { codes: ['121', '122', '815', '820', '821'], weight: 1.0 }, // Domestic violence
    { codes: ['890', '910', '920', '921'], weight: 1.0 }, // Sexual offenses
    { codes: ['753', '761', '762'], weight: 0.7 }, // Stalking, harassment
  ],
};

// Utility functions
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Get safety metric descriptions based on score
const getSafetyDescription = (type: SafetyMetricType, score: number): string => {
  if (score >= 8) {
    switch (type) {
      case SafetyMetricType.NIGHT_SAFETY:
        return "This area has very few reports of nighttime crime. Walking at night is generally considered safe.";
      case SafetyMetricType.VEHICLE_SAFETY:
        return "Vehicle-related crimes are rare in this district. Parking is generally secure.";
      case SafetyMetricType.CHILD_SAFETY:
        return "This area shows a strong safety record regarding crimes that could affect children.";
      case SafetyMetricType.TRANSIT_SAFETY:
        return "Public transportation areas report minimal safety incidents.";
      case SafetyMetricType.WOMEN_SAFETY:
        return "Few incidents targeting women have been reported in this area.";
    }
  } else if (score >= 5) {
    switch (type) {
      case SafetyMetricType.NIGHT_SAFETY:
        return "Some nighttime incidents have been reported. Basic precautions are recommended.";
      case SafetyMetricType.VEHICLE_SAFETY:
        return "Occasional vehicle-related crimes occur. Standard precautions advised.";
      case SafetyMetricType.CHILD_SAFETY:
        return "This area has an average safety record for crimes that could affect children.";
      case SafetyMetricType.TRANSIT_SAFETY:
        return "Public transit safety is moderate. Stay alert during travel.";
      case SafetyMetricType.WOMEN_SAFETY:
        return "Some incidents targeting women have been reported. Standard awareness recommended.";
    }
  } else {
    switch (type) {
      case SafetyMetricType.NIGHT_SAFETY:
        return "Higher than average nighttime incidents reported. Extra caution recommended after dark.";
      case SafetyMetricType.VEHICLE_SAFETY:
        return "Vehicle crimes are more common here. Enhanced security measures recommended.";
      case SafetyMetricType.CHILD_SAFETY:
        return "This area has more reported incidents that could affect children. Supervision recommended.";
      case SafetyMetricType.TRANSIT_SAFETY:
        return "Public transit areas have reported more incidents. Increased vigilance advised.";
      case SafetyMetricType.WOMEN_SAFETY:
        return "More incidents targeting women have been reported. Increased awareness recommended.";
    }
  }
  return "No specific information available.";
};

// Get color based on score
const getScoreColor = (score: number): string => {
  if (score >= 8) return "#22c55e"; // Green
  if (score >= 6) return "#84cc16"; // Light green
  if (score >= 5) return "#facc15"; // Yellow
  if (score >= 3) return "#f97316"; // Orange
  return "#ef4444"; // Red
};

/**
 * Fetches police incident data from LA API
 * Uses pagination to get around API limits
 */
export const fetchLAPoliceData = async (
  startDate: string,
  endDate: string,
  maxRows = 10000
): Promise<PoliceIncident[]> => {
  const baseUrl = "https://data.lacity.org/resource/2nrs-mtv8.json";
  const allData: PoliceIncident[] = [];
  const batchSize = 1000; // API limit per request
  let offset = 0;
  
  try {
    while (allData.length < maxRows) {
      // Construct query with date filters and pagination
      const queryParams = new URLSearchParams({
        "$where": `date_rptd between '${startDate}' and '${endDate}'`,
        "$offset": offset.toString(),
        "$limit": batchSize.toString(),
      });
      
      console.log(`Fetching data from LA API (offset: ${offset})...`);
      const response = await axios.get(`${baseUrl}?${queryParams}`);
      const batch = response.data;
      
      if (batch.length === 0) {
        break; // No more data
      }
      
      // Process each incident to normalize the data structure
      const processedBatch = batch.map((incident: any) => ({
        id: incident.dr_no || `LA-${incident.rpt_id}`,
        date_reported: incident.date_rptd,
        date_occurred: incident.date_occ,
        time_occurred: incident.time_occ,
        area: incident.area,
        area_name: incident.area_name,
        crime_code: incident.crm_cd,
        crime_description: incident.crm_cd_desc,
        location: {
          latitude: parseFloat(incident.lat) || null,
          longitude: parseFloat(incident.lon) || null,
        },
        district: incident.area_name,
        ...incident, // Include all original fields
      }));
      
      allData.push(...processedBatch);
      offset += batchSize;
      
      // Wait between API calls to avoid rate limiting
      await delay(500);
      
      if (allData.length >= maxRows) {
        console.log(`Reached maximum number of rows (${maxRows})`);
        break;
      }
    }
    
    console.log(`Successfully fetched ${allData.length} incidents from LA API`);
    return allData;
  } catch (error) {
    console.error("Error fetching LA police data:", error);
    throw new Error(`Failed to fetch LA police data: ${error}`);
  }
};

/**
 * Calculates safety scores for each metric type based on incidents
 */
const calculateSafetyScores = (
  incidents: PoliceIncident[],
  districtPopulation: Record<string, number>,
  city: string
): Record<string, Record<SafetyMetricType, number>> => {
  // Initialize counts for each district and metric type
  const districtMetricCounts: Record<string, Record<SafetyMetricType, number>> = {};
  
  // Process each incident
  incidents.forEach(incident => {
    const district = incident.district || incident.area_name || 'Unknown';
    if (!districtMetricCounts[district]) {
      districtMetricCounts[district] = {
        [SafetyMetricType.NIGHT_SAFETY]: 0,
        [SafetyMetricType.VEHICLE_SAFETY]: 0,
        [SafetyMetricType.CHILD_SAFETY]: 0,
        [SafetyMetricType.TRANSIT_SAFETY]: 0,
        [SafetyMetricType.WOMEN_SAFETY]: 0,
      };
    }
    
    // Determine time of day for night safety
    const isNighttime = incident.time_occurred ? 
      (parseInt(incident.time_occurred) >= 1800 || parseInt(incident.time_occurred) <= 600) : false;
    
    // Get crime mappings based on city
    const crimeMappings = city.toLowerCase() === 'los angeles' ? LA_CRIME_MAPPINGS : LA_CRIME_MAPPINGS; // Default to LA mappings for now
    
    // Check each safety metric type
    Object.entries(crimeMappings).forEach(([metricType, mappings]) => {
      const safetyType = metricType as SafetyMetricType;
      
      // Special case for night safety: only count if occurred at night
      if (safetyType === SafetyMetricType.NIGHT_SAFETY && !isNighttime) {
        return;
      }
      
      // Check if crime code matches any in this metric's mappings
      for (const mapping of mappings) {
        if (mapping.codes.includes(incident.crime_code)) {
          districtMetricCounts[district][safetyType] += mapping.weight;
          break;
        }
      }
    });
  });
  
  // Normalize counts by population to get rates
  const districtRates: Record<string, Record<SafetyMetricType, number>> = {};
  Object.entries(districtMetricCounts).forEach(([district, metricCounts]) => {
    const population = districtPopulation[district] || 10000; // Default if population unknown
    districtRates[district] = {} as Record<SafetyMetricType, number>;
    
    Object.entries(metricCounts).forEach(([metricType, count]) => {
      // Calculate incidents per 1000 people
      const rate = (count / population) * 1000;
      districtRates[district][metricType as SafetyMetricType] = rate;
    });
  });
  
  // Convert rates to scores (1-10)
  const districtScores: Record<string, Record<SafetyMetricType, number>> = {};
  
  // For each metric type, calculate percentile ranking
  Object.values(SafetyMetricType).forEach(metricType => {
    // Get all rates for this metric type
    const rates = Object.values(districtRates).map(rates => rates[metricType]);
    rates.sort((a, b) => a - b);
    
    // Calculate scores for each district
    Object.entries(districtRates).forEach(([district, metricRates]) => {
      if (!districtScores[district]) {
        districtScores[district] = {} as Record<SafetyMetricType, number>;
      }
      
      const rate = metricRates[metricType];
      // Find percentile (lower rate = higher score)
      const percentile = rates.indexOf(rate) / rates.length;
      // Convert to 1-10 scale (inverted since lower crime rate = higher safety)
      const score = Math.max(1, Math.min(10, Math.round(10 - (percentile * 9))));
      districtScores[district][metricType] = score;
    });
  });
  
  return districtScores;
};

/**
 * Gets population data for districts (simplified for MVP)
 */
const getDistrictPopulations = async (city: string): Promise<Record<string, number>> => {
  // Simplified population data for LA districts
  // In a real implementation, this would come from a database or API
  if (city.toLowerCase() === 'los angeles') {
    return {
      'Central': 40000,
      'Rampart': 165000,
      'Southwest': 195000,
      'Hollenbeck': 200000,
      'Harbor': 171000,
      'Hollywood': 300000,
      'Wilshire': 251000,
      'West LA': 228000,
      'Van Nuys': 325000,
      'West Valley': 304000,
      'Northeast': 250000,
      'Pacific': 200000,
      'N Hollywood': 220000,
      'Mission': 226000,
      'Topanga': 188000,
      'Southeast': 150000,
      'Olympic': 200000,
      '77th Street': 175000,
      'Newton': 150000,
      'Foothill': 182000,
      'Devonshire': 240000,
    };
  }
  
  // Default population estimate
  return {};
};

/**
 * Process safety metrics for a specific city
 * This is the main function that replaces the old Reddit-based insights
 */
export async function processSafetyMetrics(city: string): Promise<DistrictSafetyMetrics[]> {
  try {
    // Get the date range for the last 12 months
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Fetch incidents based on city
    let incidents: PoliceIncident[] = [];
    if (city.toLowerCase() === 'los angeles') {
      incidents = await fetchLAPoliceData(startDate, endDate);
    } else {
      throw new Error(`City ${city} is not supported yet`);
    }
    
    // Get district population data
    const populations = await getDistrictPopulations(city);
    
    // Calculate safety scores
    const districtScores = calculateSafetyScores(incidents, populations, city);
    
    // Generate safety metrics for each district
    const districtMetrics: DistrictSafetyMetrics[] = Object.entries(districtScores).map(([district, scores]) => {
      const metrics: SafetyMetric[] = [
        {
          type: SafetyMetricType.NIGHT_SAFETY,
          title: "Can I go outside after dark?",
          description: getSafetyDescription(SafetyMetricType.NIGHT_SAFETY, scores[SafetyMetricType.NIGHT_SAFETY]),
          score: {
            score: scores[SafetyMetricType.NIGHT_SAFETY],
            color: getScoreColor(scores[SafetyMetricType.NIGHT_SAFETY])
          }
        },
        {
          type: SafetyMetricType.VEHICLE_SAFETY,
          title: "Can I park here safely?",
          description: getSafetyDescription(SafetyMetricType.VEHICLE_SAFETY, scores[SafetyMetricType.VEHICLE_SAFETY]),
          score: {
            score: scores[SafetyMetricType.VEHICLE_SAFETY],
            color: getScoreColor(scores[SafetyMetricType.VEHICLE_SAFETY])
          }
        },
        {
          type: SafetyMetricType.CHILD_SAFETY,
          title: "Are kids safe here?",
          description: getSafetyDescription(SafetyMetricType.CHILD_SAFETY, scores[SafetyMetricType.CHILD_SAFETY]),
          score: {
            score: scores[SafetyMetricType.CHILD_SAFETY],
            color: getScoreColor(scores[SafetyMetricType.CHILD_SAFETY])
          }
        },
        {
          type: SafetyMetricType.TRANSIT_SAFETY,
          title: "Is it safe to use public transport?",
          description: getSafetyDescription(SafetyMetricType.TRANSIT_SAFETY, scores[SafetyMetricType.TRANSIT_SAFETY]),
          score: {
            score: scores[SafetyMetricType.TRANSIT_SAFETY],
            color: getScoreColor(scores[SafetyMetricType.TRANSIT_SAFETY])
          }
        },
        {
          type: SafetyMetricType.WOMEN_SAFETY,
          title: "Would I be harassed here?",
          description: getSafetyDescription(SafetyMetricType.WOMEN_SAFETY, scores[SafetyMetricType.WOMEN_SAFETY]),
          score: {
            score: scores[SafetyMetricType.WOMEN_SAFETY],
            color: getScoreColor(scores[SafetyMetricType.WOMEN_SAFETY])
          }
        }
      ];
      
      return {
        district,
        city,
        metrics,
        lastUpdated: new Date().toISOString(),
      };
    });
    
    // Store metrics in database
    await storeSafetyMetrics(districtMetrics);
    
    return districtMetrics;
  } catch (error) {
    console.error("Error processing safety metrics:", error);
    throw new Error(`Failed to process safety metrics: ${error}`);
  }
}

/**
 * Store metrics in Supabase
 */
const storeSafetyMetrics = async (metrics: DistrictSafetyMetrics[]): Promise<void> => {
  try {
    for (const districtMetric of metrics) {
      // Check if this district already has metrics
      const { data: existingData } = await supabase
        .from('safety_metrics')
        .select('id')
        .eq('district', districtMetric.district)
        .eq('city', districtMetric.city)
        .single();
      
      if (existingData) {
        // Update existing record
        await supabase
          .from('safety_metrics')
          .update({
            metrics: districtMetric.metrics,
            lastUpdated: districtMetric.lastUpdated
          })
          .eq('id', existingData.id);
      } else {
        // Insert new record
        await supabase
          .from('safety_metrics')
          .insert(districtMetric);
      }
    }
    
    console.log(`Successfully stored ${metrics.length} district safety metrics`);
  } catch (error) {
    console.error("Error storing safety metrics:", error);
    throw new Error(`Failed to store safety metrics: ${error}`);
  }
};

/**
 * Retrieve safety metrics for a specific location
 */
export async function getSafetyMetricsForLocation(
  latitude: number,
  longitude: number,
  city: string
): Promise<DistrictSafetyMetrics | null> {
  try {
    // Find the district for this location
    const district = await getDistrictForCoordinates(latitude, longitude, city);
    
    if (!district) {
      return null;
    }
    
    // Get metrics for this district
    const { data } = await supabase
      .from('safety_metrics')
      .select('*')
      .eq('district', district)
      .eq('city', city)
      .single();
    
    if (!data) {
      // If no metrics exist in the database, process them
      const cityMetrics = await processSafetyMetrics(city);
      const districtMetrics = cityMetrics.find(m => m.district === district);
      return districtMetrics || null;
    }
    
    return data as DistrictSafetyMetrics;
  } catch (error) {
    console.error("Error getting safety metrics for location:", error);
    return null;
  }
}

/**
 * Map coordinates to a district name
 */
async function getDistrictForCoordinates(
  latitude: number,
  longitude: number,
  city: string
): Promise<string | null> {
  // For MVP, use a simplified approach for LA
  if (city.toLowerCase() === 'los angeles') {
    try {
      // Query the LA API for the closest incident to get district
      const baseUrl = "https://data.lacity.org/resource/2nrs-mtv8.json";
      const queryParams = new URLSearchParams({
        "$where": `lat between ${latitude - 0.01} and ${latitude + 0.01} and lon between ${longitude - 0.01} and ${longitude + 0.01}`,
        "$limit": "1",
      });
      
      const response = await axios.get(`${baseUrl}?${queryParams}`);
      if (response.data.length > 0) {
        return response.data[0].area_name || null;
      }
      
      // Fall back to a spatial query in our database if available
      const { data } = await supabase.rpc('find_la_district', {
        lat: latitude,
        lng: longitude
      });
      
      return data?.district || null;
    } catch (error) {
      console.error("Error getting district for coordinates:", error);
      return null;
    }
  }
  
  return null;
}

// Legacy function to maintain compatibility with existing code
export async function findNearbyInsights(latitude: number, longitude: number, radiusKm: number = 2) {
  console.warn("findNearbyInsights is deprecated. Use getSafetyMetricsForLocation instead.");
  return getSafetyMetricsForLocation(latitude, longitude, 'Los Angeles');
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

// Legacy function to maintain compatibility with existing code
export async function findOrGenerateTakeaways(
  latitude: number,
  longitude: number,
  radius: number
): Promise<SafetyTakeaways | null> {
  try {
    // Get safety metrics
    const metrics = await getSafetyMetricsForLocation(latitude, longitude, 'Los Angeles');
    
    if (!metrics) {
      return null;
    }
    
    // Generate takeaways based on safety metrics
    const scores = metrics.metrics.map(m => m.score.score);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Find best and worst metrics
    const sortedMetrics = [...metrics.metrics].sort((a, b) => b.score.score - a.score.score);
    const bestMetric = sortedMetrics[0];
    const worstMetric = sortedMetrics[sortedMetrics.length - 1];
    
    // Generate takeaways
    const positiveTakeaway = bestMetric.score.score >= 7 
      ? `This area scores well for ${bestMetric.title.replace('?', '')}: ${bestMetric.description}`
      : null;
    
    const negativeTakeaway = worstMetric.score.score <= 5
      ? `This area has concerns regarding ${worstMetric.title.replace('?', '')}: ${worstMetric.description}`
      : null;
    
    const neutralTakeaway = `Overall safety in ${metrics.district} is ${
      avgScore >= 8 ? 'excellent' : 
      avgScore >= 6 ? 'good' : 
      avgScore >= 4 ? 'moderate' : 
      'concerning'
    } based on official police data.`;
    
    const takeaways: SafetyTakeaways = {
      latitude,
      longitude,
      radius,
      positive_takeaway: positiveTakeaway,
      negative_takeaway: negativeTakeaway,
      neutral_takeaway: neutralTakeaway,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 30 days
    };
    
    // Store takeaways in database
    const { data, error } = await supabase
      .from('safety_takeaways')
      .insert(takeaways)
      .select()
      .single();
    
    if (error) {
      console.error("Error storing safety takeaways:", error);
    }
    
    return data || takeaways;
  } catch (error) {
    console.error("Error generating takeaways:", error);
    return null;
  }
} 