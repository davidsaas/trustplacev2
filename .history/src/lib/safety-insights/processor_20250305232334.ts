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
 * Geocode a location using OpenStreetMap Nominatim API
 */
async function geocodeLocation(location: string, city: string) {
  if (location === 'unspecified') return null;
  
  try {
    // Format the query to include the city for better results
    const query = `${location}, ${city}`;
    const encodedQuery = encodeURIComponent(query);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'TrustPlace/1.0',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      
      // Try to extract district from address
      let district = null;
      if (result.address) {
        district = result.address.suburb || 
                  result.address.neighbourhood || 
                  result.address.district ||
                  null;
      }
      
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        district,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
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