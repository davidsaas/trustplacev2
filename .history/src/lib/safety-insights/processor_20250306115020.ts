import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in .env.local');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini AI
const geminiKey = process.env.GEMINI_API_KEY;
if (!geminiKey) {
  throw new Error('Missing Gemini API key in .env.local');
}

const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Types
interface RedditPost {
  id: string;
  parsedId: string;
  url: string;
  username: string;
  userId: string;
  title: string;
  communityName: string;
  parsedCommunityName: string;
  body: string;
  createdAt: string;
  // Add other fields as needed
}

interface ProcessedInsight {
  comment_id: string;
  source: string;
  title: string;
  body: string;
  url: string;
  username: string;
  community_name: string;
  created_at: string;
  is_safety_related: boolean;
  safety_score: number;
  sentiment: string;
  location_mentioned: string;
  latitude: number | null;
  longitude: number | null;
  district: string | null;
  city: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fix the duplicate property names in the LA_NEIGHBORHOODS object
const LA_NEIGHBORHOODS: Record<string, { lat: number; lon: number }> = {
  "los angeles": { lat: 34.0536909, lon: -118.242766 },
  "la": { lat: 34.0536909, lon: -118.242766 },
  "hollywood": { lat: 34.0928092, lon: -118.3286614 },
  "west hollywood": { lat: 34.0900091, lon: -118.3617443 },
  "santa monica": { lat: 34.0194543, lon: -118.4911912 },
  "venice": { lat: 33.9850469, lon: -118.4694832 },
  "downtown": { lat: 34.0430175, lon: -118.2694428 },
  "dtla": { lat: 34.0430175, lon: -118.2694428 },
  "koreatown": { lat: 34.0592146, lon: -118.3079649 },
  "k-town": { lat: 34.0592146, lon: -118.3079649 },
  "silver lake": { lat: 34.0869469, lon: -118.2702036 },
  "echo park": { lat: 34.0782175, lon: -118.2606471 },
  "burbank": { lat: 34.1808392, lon: -118.3089661 },
  "glendale": { lat: 34.1425078, lon: -118.2551263 },
  "pasadena": { lat: 34.1477849, lon: -118.1445155 },
  "culver city": { lat: 34.0211224, lon: -118.3964665 },
  "beverly hills": { lat: 34.0736204, lon: -118.4003563 },
  "bel air": { lat: 34.0861814, lon: -118.4684248 },
  "studio city": { lat: 34.1395597, lon: -118.3870991 },
  "sherman oaks": { lat: 34.1508718, lon: -118.4489865 },
  "encino": { lat: 34.1517344, lon: -118.5214553 },
  "tarzana": { lat: 34.1745409, lon: -118.5541308 },
  "woodland hills": { lat: 34.1683177, lon: -118.6058768 },
  "van nuys": { lat: 34.1898566, lon: -118.4514891 },
  "north hollywood": { lat: 34.1720411, lon: -118.3769893 },
  "noho": { lat: 34.1720411, lon: -118.3769893 },
  "universal city": { lat: 34.1381517, lon: -118.3592203 },
  "griffith park": { lat: 34.1365, lon: -118.2945 },
  "eagle rock": { lat: 34.1394791, lon: -118.1968478 },
  "highland park": { lat: 34.1155831, lon: -118.1878451 },
  "mt washington": { lat: 34.0989735, lon: -118.2168138 },
  "mount washington": { lat: 34.0989735, lon: -118.2168138 },
  "boyle heights": { lat: 34.0357891, lon: -118.2023689 },
  "east la": { lat: 34.0239015, lon: -118.1726659 },
  "east los angeles": { lat: 34.0239015, lon: -118.1726659 },
  "south la": { lat: 33.9602808, lon: -118.3026284 },
  "south los angeles": { lat: 33.9602808, lon: -118.3026284 },
  "inglewood": { lat: 33.9562984, lon: -118.3531078 },
  "compton": { lat: 33.8958492, lon: -118.2200712 },
  "long beach": { lat: 33.7700504, lon: -118.1937395 },
  "malibu": { lat: 34.0259216, lon: -118.7797071 },
  "westwood": { lat: 34.0635016, lon: -118.4455164 },
  "century city": { lat: 34.0564344, lon: -118.4176385 },
  "mid-city": { lat: 34.0473431, lon: -118.3503379 },
  "mid city": { lat: 34.0473431, lon: -118.3503379 },
  "pico-robertson": { lat: 34.0523105, lon: -118.3868707 },
  "pico robertson": { lat: 34.0523105, lon: -118.3868707 },
  "mar vista": { lat: 34.0024832, lon: -118.4312444 },
  "palms": { lat: 34.0263802, lon: -118.4015257 },
  "westchester": { lat: 33.9597322, lon: -118.3984389 },
  "playa del rey": { lat: 33.9537611, lon: -118.4375137 },
  "playa vista": { lat: 33.9748232, lon: -118.4169813 },
  "marina del rey": { lat: 33.9802893, lon: -118.4517449 },
  "el segundo": { lat: 33.9191799, lon: -118.4164652 },
  "manhattan beach": { lat: 33.8847361, lon: -118.4109089 },
  "hermosa beach": { lat: 33.8622366, lon: -118.3995194 },
  "redondo beach": { lat: 33.8491816, lon: -118.3884176 },
  "torrance": { lat: 33.8358492, lon: -118.3406288 },
  "palos verdes": { lat: 33.7444613, lon: -118.3870173 },
  "san pedro": { lat: 33.7360619, lon: -118.2922461 },
  "wilmington": { lat: 33.7730867, lon: -118.2673371 },
  "carson": { lat: 33.8316745, lon: -118.281693 },
  "gardena": { lat: 33.8883487, lon: -118.3089624 },
  "hawthorne": { lat: 33.9164032, lon: -118.3525748 },
  "lawndale": { lat: 33.8872903, lon: -118.3531078 },
  "lomita": { lat: 33.7922772, lon: -118.3153686 },
  "san fernando valley": { lat: 34.1825069, lon: -118.4396574 },
  "sfv": { lat: 34.1825069, lon: -118.4396574 },
  "the valley": { lat: 34.1825069, lon: -118.4396574 },
  "west la": { lat: 34.0411401, lon: -118.4412194 },
  "west los angeles": { lat: 34.0411401, lon: -118.4412194 },
  "westside": { lat: 34.0411401, lon: -118.4412194 },
  "arts district": { lat: 34.0403, lon: -118.2351 },
  "little tokyo": { lat: 34.0505, lon: -118.2424 },
  "chinatown": { lat: 34.0623, lon: -118.2383 },
  "los feliz": { lat: 34.1063, lon: -118.2848 },
  "atwater village": { lat: 34.1146, lon: -118.2602 },
  "glassell park": { lat: 34.1156, lon: -118.2256 },
  "cypress park": { lat: 34.0896, lon: -118.2256 },
  "lincoln heights": { lat: 34.0731, lon: -118.2126 },
  "el sereno": { lat: 34.0892, lon: -118.1765 },
  "montecito heights": { lat: 34.0892, lon: -118.1765 },
  "downtown la": { lat: 34.0430175, lon: -118.2694428 },
  "hollywood hills": { lat: 34.1184, lon: -118.3004 },
  "laurel canyon": { lat: 34.1259, lon: -118.3795 },
  "beachwood canyon": { lat: 34.1184, lon: -118.3004 },
  "miracle mile": { lat: 34.0624, lon: -118.3542 },
  "fairfax": { lat: 34.0780, lon: -118.3614 },
  "melrose": { lat: 34.0841, lon: -118.3614 },
  "la brea": { lat: 34.0624, lon: -118.3441 },
  "hancock park": { lat: 34.0741, lon: -118.3441 },
  "larchmont": { lat: 34.0741, lon: -118.3237 },
  "koreatown_alt": { lat: 34.0624, lon: -118.3034 },
  "pico-union_alt": { lat: 34.0468, lon: -118.2830 },
  "university park": { lat: 34.0312, lon: -118.2830 },
  "exposition park": { lat: 34.0156, lon: -118.2830 },
  "leimert park": { lat: 34.0000, lon: -118.3237 },
  "baldwin hills": { lat: 34.0000, lon: -118.3441 },
  "crenshaw": { lat: 34.0156, lon: -118.3237 },
  "mid-wilshire_alt": { lat: 34.0624, lon: -118.3237 },
  "harvard heights_alt": { lat: 34.0468, lon: -118.3034 },
  "west adams": { lat: 34.0312, lon: -118.3237 },
  "jefferson park": { lat: 34.0312, lon: -118.3237 },
  "arlington heights_alt": { lat: 34.0312, lon: -118.3034 },
  "vermont square": { lat: 34.0000, lon: -118.2830 },
  "vermont-slauson": { lat: 33.9844, lon: -118.2830 },
  "florence": { lat: 33.9844, lon: -118.2626 },
  "harvard park": { lat: 33.9844, lon: -118.3034 },
  "chesterfield square": { lat: 33.9844, lon: -118.3034 },
  "manchester square": { lat: 33.9688, lon: -118.3034 },
  "gramercy park": { lat: 33.9688, lon: -118.3237 },
  "hyde park": { lat: 33.9688, lon: -118.3237 },
  "view park-windsor hills": { lat: 33.9844, lon: -118.3441 },
  "ladera heights": { lat: 33.9844, lon: -118.3644 },
  "windsor hills": { lat: 33.9844, lon: -118.3441 },
  "view park": { lat: 33.9844, lon: -118.3441 },
  "baldwin village": { lat: 34.0000, lon: -118.3441 },
  "baldwin vista": { lat: 34.0000, lon: -118.3441 },
  "village green": { lat: 34.0000, lon: -118.3441 },
  "jefferson": { lat: 34.0312, lon: -118.3237 },
  "adams-normandie": { lat: 34.0312, lon: -118.2830 },
  "exposition": { lat: 34.0156, lon: -118.2830 },
  "university": { lat: 34.0312, lon: -118.2830 },
  "vermont harbor": { lat: 33.9688, lon: -118.2830 },
  "vermont knolls": { lat: 33.9688, lon: -118.2830 },
  "vermont vista": { lat: 33.9532, lon: -118.2830 },
  "harbor gateway": { lat: 33.9532, lon: -118.2830 },
  "watts": { lat: 33.9532, lon: -118.2626 },
  "green meadows": { lat: 33.9532, lon: -118.2626 },
  "florence-firestone": { lat: 33.9688, lon: -118.2626 },
  "walnut park": { lat: 33.9688, lon: -118.2423 },
  "huntington park": { lat: 33.9844, lon: -118.2423 },
  "vernon": { lat: 34.0000, lon: -118.2423 },
  "commerce": { lat: 34.0000, lon: -118.2219 },
  "maywood": { lat: 33.9844, lon: -118.2219 },
  "bell": { lat: 33.9844, lon: -118.2219 },
  "bell gardens": { lat: 33.9688, lon: -118.2219 },
  "cudahy": { lat: 33.9688, lon: -118.2219 },
  "south gate": { lat: 33.9532, lon: -118.2219 },
  "lynwood": { lat: 33.9532, lon: -118.2219 },
  "paramount": { lat: 33.9532, lon: -118.2016 },
  "downey": { lat: 33.9532, lon: -118.2016 },
  "bellflower": { lat: 33.9376, lon: -118.2016 },
  "norwalk": { lat: 33.9376, lon: -118.1812 },
  "cerritos": { lat: 33.9376, lon: -118.1812 },
  "artesia": { lat: 33.9376, lon: -118.1812 },
  "lakewood": { lat: 33.9376, lon: -118.1609 },
  "signal hill": { lat: 33.9220, lon: -118.1609 },
  "hawaiian gardens": { lat: 33.9220, lon: -118.1609 },
  "cypress": { lat: 33.9220, lon: -118.1406 },
  "los alamitos": { lat: 33.9220, lon: -118.1406 },
  "rossmoor": { lat: 33.9220, lon: -118.1406 },
  "seal beach": { lat: 33.9064, lon: -118.1406 },
  "sunset beach": { lat: 33.9064, lon: -118.1406 },
  "huntington beach": { lat: 33.9064, lon: -118.1203 },
  "fountain valley": { lat: 33.9064, lon: -118.1203 },
  "westminster": { lat: 33.9064, lon: -118.1203 },
  "garden grove": { lat: 33.9064, lon: -118.1000 },
  "stanton": { lat: 33.9064, lon: -118.1000 },
  "anaheim": { lat: 33.9064, lon: -118.1000 },
  "orange": { lat: 33.9064, lon: -118.0797 },
  "santa ana": { lat: 33.9064, lon: -118.0797 },
  "tustin": { lat: 33.9064, lon: -118.0797 },
  "irvine": { lat: 33.9064, lon: -118.0594 },
  "costa mesa": { lat: 33.9064, lon: -118.0594 },
  "newport beach": { lat: 33.9064, lon: -118.0594 },
  "laguna beach": { lat: 33.9064, lon: -118.0391 },
  "laguna hills": { lat: 33.9064, lon: -118.0391 },
  "aliso viejo": { lat: 33.9064, lon: -118.0391 },
  "mission viejo": { lat: 33.9064, lon: -118.0188 },
  "laguna niguel": { lat: 33.9064, lon: -118.0188 },
  "san juan capistrano": { lat: 33.9064, lon: -118.0188 },
  "dana point": { lat: 33.9064, lon: -117.9985 },
  "san clemente": { lat: 33.9064, lon: -117.9985 },
  "san onofre": { lat: 33.9064, lon: -117.9985 },
  "oceanside": { lat: 33.9064, lon: -117.9782 },
  "carlsbad": { lat: 33.9064, lon: -117.9782 },
  "encinitas": { lat: 33.9064, lon: -117.9782 },
  "solana beach": { lat: 33.9064, lon: -117.9579 },
  "del mar": { lat: 33.9064, lon: -117.9579 },
  "la jolla": { lat: 33.9064, lon: -117.9579 },
  "pacific palisades": { lat: 34.0356, lon: -118.5273 },
  "brentwood": { lat: 34.0520, lon: -118.4765 },
  "sawtelle": { lat: 34.0356, lon: -118.4460 },
  "rancho park": { lat: 34.0356, lon: -118.4257 },
  "cheviot hills": { lat: 34.0356, lon: -118.4054 },
  "beverlywood": { lat: 34.0356, lon: -118.3851 },
  "pico-robertson_alt": { lat: 34.0520, lon: -118.3851 },
  "carthay": { lat: 34.0520, lon: -118.3648 },
  "mid-wilshire": { lat: 34.0520, lon: -118.3445 },
  "mid-city_alt": { lat: 34.0520, lon: -118.3242 },
  "arlington heights": { lat: 34.0520, lon: -118.3039 },
  "harvard heights": { lat: 34.0520, lon: -118.2836 },
  "pico-union": { lat: 34.0520, lon: -118.2633 },
  "westlake": { lat: 34.0520, lon: -118.2430 },
  "echo park_alt": { lat: 34.0684, lon: -118.2430 },
  "elysian park": { lat: 34.0684, lon: -118.2227 },
  "elysian valley": { lat: 34.0684, lon: -118.2227 },
  "lincoln heights_alt": { lat: 34.0684, lon: -118.2024 },
  "montecito heights_alt": { lat: 34.0684, lon: -118.2024 },
  "el sereno_alt": { lat: 34.0684, lon: -118.1821 },
  "city terrace": { lat: 34.0684, lon: -118.1821 },
  "east los angeles_alt": { lat: 34.0684, lon: -118.1618 },
  "monterey park": { lat: 34.0684, lon: -118.1415 },
  "alhambra": { lat: 34.0684, lon: -118.1415 },
  "south pasadena": { lat: 34.0848, lon: -118.1415 },
  "san marino": { lat: 34.0848, lon: -118.1212 },
  "pasadena_alt": { lat: 34.0848, lon: -118.1212 },
  "altadena": { lat: 34.1012, lon: -118.1212 },
  "la canada flintridge": { lat: 34.1012, lon: -118.1212 },
  "la crescenta-montrose": { lat: 34.1012, lon: -118.1212 },
  "sunland-tujunga": { lat: 34.1012, lon: -118.1009 },
  "shadow hills": { lat: 34.1012, lon: -118.1009 },
  "sun valley": { lat: 34.1012, lon: -118.1009 },
  "north hollywood_alt": { lat: 34.1012, lon: -118.0806 },
  "valley village": { lat: 34.1012, lon: -118.0806 },
  "studio city_alt": { lat: 34.1012, lon: -118.0806 },
  "sherman oaks_alt": { lat: 34.1012, lon: -118.0603 },
  "encino_alt": { lat: 34.1012, lon: -118.0603 },
  "tarzana_alt": { lat: 34.1012, lon: -118.0400 },
  "woodland hills_alt": { lat: 34.1012, lon: -118.0400 },
  "west hills": { lat: 34.1012, lon: -118.0400 },
  "canoga park": { lat: 34.1012, lon: -118.0197 },
  "winnetka": { lat: 34.1012, lon: -118.0197 },
  "reseda": { lat: 34.1012, lon: -118.0197 },
  "northridge": { lat: 34.1176, lon: -118.0197 },
  "granada hills": { lat: 34.1176, lon: -118.0197 },
  "porter ranch": { lat: 34.1176, lon: -118.0197 },
  "chatsworth": { lat: 34.1176, lon: -118.0197 },
  "mission hills": { lat: 34.1176, lon: -118.0197 },
  "panorama city": { lat: 34.1176, lon: -118.0197 },
  "arleta": { lat: 34.1176, lon: -118.0197 },
  "pacoima": { lat: 34.1176, lon: -118.0197 },
  "sylmar": { lat: 34.1176, lon: -118.0197 },
  "san fernando": { lat: 34.1176, lon: -118.0197 },
  "b line": { lat: 34.0536909, lon: -118.242766 }, // Metro B Line (Red) runs through downtown LA
  "red line": { lat: 34.0536909, lon: -118.242766 },
  "metro b line": { lat: 34.0536909, lon: -118.242766 },
  "metro red line": { lat: 34.0536909, lon: -118.242766 }
};

async function geocodeLocation(location: string, city: string) {
  if (!location || location.toLowerCase() === 'unspecified') {
    console.log(`No specific location mentioned for geocoding in ${city}`);
    return { latitude: null, longitude: null, district: null };
  }

  try {
    // Check if the location is in our database first
    const normalizedLocation = location.toLowerCase().trim();
    
    // Check for exact match in our database
    if (LA_NEIGHBORHOODS[normalizedLocation]) {
      const coords = LA_NEIGHBORHOODS[normalizedLocation];
      console.log(`Found ${location} in local database: ${coords.lat}, ${coords.lon}`);
      return {
        latitude: coords.lat,
        longitude: coords.lon,
        district: null
      };
    }
    
    // Handle multiple locations separated by commas
    if (normalizedLocation.includes(',')) {
      const locations = normalizedLocation.split(',').map(l => l.trim());
      
      // Try to find any of the mentioned locations in our database
      for (const loc of locations) {
        if (LA_NEIGHBORHOODS[loc]) {
          const coords = LA_NEIGHBORHOODS[loc];
          console.log(`Found ${loc} (from multiple locations) in local database: ${coords.lat}, ${coords.lon}`);
          return {
            latitude: coords.lat,
            longitude: coords.lon,
            district: null
          };
        }
      }
      
      // If none found in database, try the first location with Nominatim
      const firstLocation = locations[0];
      const searchQuery = `${firstLocation}, ${city}, California`;
      console.log(`Geocoding first location from multiple: ${searchQuery}`);
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        console.log(`Found coordinates for ${firstLocation}: ${data[0].lat}, ${data[0].lon}`);
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          district: data[0].display_name.split(',')[0] || null
        };
      }
    }
    
    // For single locations not in our database, try Nominatim
    const searchQuery = `${location}, ${city}, California`;
    console.log(`Geocoding: ${searchQuery}`);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      console.log(`Found coordinates: ${data[0].lat}, ${data[0].lon}`);
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        district: data[0].display_name.split(',')[0] || null
      };
    }
    
    // If Nominatim fails, check if any part of the location matches our database
    // This handles cases like "near Hollywood" or "Hollywood area"
    for (const [key, value] of Object.entries(LA_NEIGHBORHOODS)) {
      if (normalizedLocation.includes(key)) {
        console.log(`Found partial match "${key}" in "${normalizedLocation}": ${value.lat}, ${value.lon}`);
        return {
          latitude: value.lat,
          longitude: value.lon,
          district: null
        };
      }
    }
    
    // If all else fails, return the city center coordinates
    if (LA_NEIGHBORHOODS[city.toLowerCase()]) {
      const cityCoords = LA_NEIGHBORHOODS[city.toLowerCase()];
      console.log(`Using city center coordinates for ${location}: ${cityCoords.lat}, ${cityCoords.lon}`);
      return {
        latitude: cityCoords.lat,
        longitude: cityCoords.lon,
        district: null
      };
    }
    
    console.log(`No coordinates found for ${location} in ${city}`);
    return { latitude: null, longitude: null, district: null };
  } catch (error: any) {
    console.error(`Error geocoding location ${location}:`, error.message);
    return { latitude: null, longitude: null, district: null };
  }
}

/**
 * Process a batch of Reddit posts to extract safety insights
 */
export async function processSafetyInsights(posts: RedditPost[], city: string): Promise<ProcessedInsight[]> {
  const processedInsights: ProcessedInsight[] = [];
  
  for (const post of posts) {
    try {
      // Skip processing if already in database
      const { data: existingRecord } = await supabase
        .from('safety_insights')
        .select('id')
        .eq('comment_id', post.id)
        .single();
      
      if (existingRecord) {
        console.log(`Post ${post.id} already processed, skipping`);
        continue;
      }
      
      // Analyze with Gemini AI
      const aiResult = await analyzeWithGemini(post, city);
      
      if (aiResult.is_safety_related) {
        // Geocode the location if safety-related
        const geocodeResult = await geocodeLocation(aiResult.location_mentioned, city);
        
        const processedInsight: ProcessedInsight = {
          ...aiResult,
          latitude: geocodeResult?.latitude || null,
          longitude: geocodeResult?.longitude || null,
          district: geocodeResult?.district || null,
        };
        
        // Store in Supabase
        const { error } = await supabase
          .from('safety_insights')
          .insert([processedInsight]);
        
        if (error) {
          console.error('Error storing insight:', error);
        } else {
          processedInsights.push(processedInsight);
        }
      }
    } catch (error) {
      console.error(`Error processing post ${post.id}:`, error);
    }
  }
  
  return processedInsights;
}

/**
 * Analyze a Reddit post with Gemini AI to extract safety information
 */
async function analyzeWithGemini(post: RedditPost, city: string): Promise<Omit<ProcessedInsight, 'latitude' | 'longitude' | 'district'>> {
  const maxRetries = 3;
  const baseDelay = 2000; // 2 seconds

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add delay between requests, increasing with each retry
      if (attempt > 0) {
        await delay(baseDelay * Math.pow(2, attempt));
      }

      const prompt = `
        Analyze this Reddit post about ${city} and determine if it's related to safety concerns.
        Return ONLY a JSON object with no markdown formatting or code blocks.
        
        Title: ${post.title}
        Body: ${post.body}
        
        Response format:
        {
          "is_safety_related": boolean (true if the post discusses safety concerns, crime, danger, etc.),
          "safety_score": number (0-1, where 0 is completely safe and 1 is very dangerous),
          "sentiment": string ("positive", "negative", or "neutral"),
          "location_mentioned": string (extract any specific locations mentioned in ${city}, or "unspecified" if none)
        }
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      let responseText = response.text().trim();

      // Remove any markdown code block formatting
      if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```json\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');
      }

      try {
        const parsedResponse = JSON.parse(responseText);
        return {
          comment_id: post.id,
          source: 'reddit',
          title: post.title,
          body: post.body,
          url: post.url,
          username: post.username,
          community_name: post.communityName,
          created_at: post.createdAt,
          is_safety_related: parsedResponse.is_safety_related || false,
          safety_score: parsedResponse.safety_score || 0,
          sentiment: parsedResponse.sentiment || 'neutral',
          location_mentioned: parsedResponse.location_mentioned || 'unspecified',
          city,
        };
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError, 'Response:', responseText);
        return {
          comment_id: post.id,
          source: 'reddit',
          title: post.title,
          body: post.body,
          url: post.url,
          username: post.username,
          community_name: post.communityName,
          created_at: post.createdAt,
          is_safety_related: false,
          safety_score: 0,
          sentiment: 'neutral',
          location_mentioned: 'unspecified',
          city,
        };
      }
    } catch (error: any) {
      if (error.status === 429) {
        console.log(`Rate limit hit, attempt ${attempt + 1} of ${maxRetries}. Waiting ${baseDelay * Math.pow(2, attempt)}ms before retry...`);
        if (attempt === maxRetries - 1) {
          console.error('Max retries reached for rate limit, skipping this analysis');
          return {
            comment_id: post.id,
            source: 'reddit',
            title: post.title,
            body: post.body,
            url: post.url,
            username: post.username,
            community_name: post.communityName,
            created_at: post.createdAt,
            is_safety_related: false,
            safety_score: 0,
            sentiment: 'neutral',
            location_mentioned: 'unspecified',
            city,
          };
        }
        continue;
      }
      console.error('Error calling Gemini API:', error);
      return {
        comment_id: post.id,
        source: 'reddit',
        title: post.title,
        body: post.body,
        url: post.url,
        username: post.username,
        community_name: post.communityName,
        created_at: post.createdAt,
        is_safety_related: false,
        safety_score: 0,
        sentiment: 'neutral',
        location_mentioned: 'unspecified',
        city,
      };
    }
  }
  return {
    comment_id: post.id,
    source: 'reddit',
    title: post.title,
    body: post.body,
    url: post.url,
    username: post.username,
    community_name: post.communityName,
    created_at: post.createdAt,
    is_safety_related: false,
    safety_score: 0,
    sentiment: 'neutral',
    location_mentioned: 'unspecified',
    city,
  };
}

/**
 * Load and process Reddit data from a local JSON file
 */
export async function processLocalJsonFile(filePath: string, city: string): Promise<ProcessedInsight[]> {
  try {
    // Read the local file
    const absolutePath = resolve(process.cwd(), filePath);
    const fileContent = await fs.readFile(absolutePath, 'utf-8');
    const posts: RedditPost[] = JSON.parse(fileContent);
    
    return await processSafetyInsights(posts, city);
  } catch (error) {
    console.error('Error processing local JSON file:', error);
    return [];
  }
}

/**
 * Fetch and process Reddit data from Apify API
 */
export async function processApifyData(apifyUrl: string, city: string): Promise<ProcessedInsight[]> {
  try {
    const response = await fetch(apifyUrl);
    const posts: RedditPost[] = await response.json();
    
    return await processSafetyInsights(posts, city);
  } catch (error) {
    console.error('Error processing Apify data:', error);
    return [];
  }
}

/**
 * Find safety insights near a specific location
 */
export async function findNearbyInsights(latitude: number, longitude: number, radiusKm: number = 2) {
  // Convert radius to degrees (approximate)
  const radiusDegrees = radiusKm / 111;
  
  const { data, error } = await supabase
    .from('safety_insights')
    .select('*')
    .gte('latitude', latitude - radiusDegrees)
    .lte('latitude', latitude + radiusDegrees)
    .gte('longitude', longitude - radiusDegrees)
    .lte('longitude', longitude + radiusDegrees)
    .eq('is_safety_related', true);
  
  if (error) {
    console.error('Error fetching nearby insights:', error);
    return [];
  }
  
  // Sort by distance (Euclidean distance as a simple approximation)
  return data.sort((a, b) => {
    const distA = Math.sqrt(
      Math.pow(a.latitude - latitude, 2) + 
      Math.pow(a.longitude - longitude, 2)
    );
    const distB = Math.sqrt(
      Math.pow(b.latitude - latitude, 2) + 
      Math.pow(b.longitude - longitude, 2)
    );
    return distA - distB;
  });
}

/**
 * Interface for safety takeaways
 */
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

/**
 * Find or generate safety takeaways for a location
 */
export async function findOrGenerateTakeaways(latitude: number, longitude: number, radius: number = 2): Promise<SafetyTakeaways | null> {
  try {
    // Check if we have cached takeaways in the database
    const { data: existingTakeaways, error: fetchError } = await supabase
      .from('safety_takeaways')
      .select('*')
      .eq('latitude', latitude)
      .eq('longitude', longitude)
      .eq('radius', radius)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingTakeaways) {
      return existingTakeaways;
    }

    // If no valid takeaways exist, fetch nearby insights and generate new ones
    const insights = await findNearbyInsights(latitude, longitude, radius);
    
    if (!insights || insights.length === 0) {
      return null;
    }

    // Generate takeaways using Gemini
    const takeaways = await generateTakeaways(insights);
    
    if (!takeaways) {
      return null;
    }

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Save to database
    const newTakeaway = {
      latitude,
      longitude,
      radius,
      positive_takeaway: takeaways.positive,
      negative_takeaway: takeaways.negative,
      neutral_takeaway: takeaways.neutral,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    };

    const { data: savedTakeaway, error: insertError } = await supabase
      .from('safety_takeaways')
      .insert([newTakeaway])
      .select()
      .single();

    if (insertError) {
      console.error('Error saving takeaways:', insertError);
      return null;
    }

    return savedTakeaway;
  } catch (error) {
    console.error('Error in findOrGenerateTakeaways:', error);
    return null;
  }
}

async function generateTakeaways(insights: any[]): Promise<{ positive: string | null; negative: string | null; neutral: string | null } | null> {
  try {
    const prompt = `Analyze these safety-related insights and generate three concise takeaways:
    1. A positive takeaway about safety in this area
    2. A negative takeaway or warning about safety concerns
    3. A neutral observation about the area's safety

    Insights:
    ${insights.map(i => `- ${i.body}`).join('\n')}

    Format your response exactly like this example:
    {
      "positive": "Well-lit streets and active neighborhood watch program",
      "negative": "Some reports of car break-ins during late hours",
      "neutral": "Mixed reviews about safety, varying by time of day"
    }`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Error parsing Gemini response:', e);
      return null;
    }
  } catch (error) {
    console.error('Error generating takeaways:', error);
    return null;
  }
} 