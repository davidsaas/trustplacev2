import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

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
interface Review {
  id: string;
  text: string;
  date: string;
  rating: number;
  author: string;
  authorImage?: string;
}

/**
 * Interface for review takeaways
 */
export interface ReviewTakeaways {
  id?: string;
  listing_id: string;
  positive_takeaway: string | null;
  negative_takeaway: string | null;
  summary_takeaway: string | null;
  created_at?: string;
  expires_at?: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Find or generate review takeaways for a listing
 */
export async function findOrGenerateReviewTakeaways(listingId: string): Promise<ReviewTakeaways | null> {
  try {
    // First, check if we have valid takeaways in the database
    const { data: existingTakeaways, error: fetchError } = await supabase
      .from('review_takeaways')
      .select('*')
      .eq('listing_id', listingId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!fetchError && existingTakeaways) {
      console.log('Found existing takeaways for listing');
      return existingTakeaways;
    }
    
    // If no valid takeaways found, fetch reviews to generate new takeaways
    const { data: reviews, error: reviewsError } = await supabase
      .from('safety_reviews')
      .select('*')
      .eq('listing_id', listingId);
    
    if (reviewsError || !reviews || reviews.length === 0) {
      console.log('No reviews found for listing, cannot generate takeaways');
      return null;
    }
    
    // Generate takeaways using AI
    const takeaways = await generateTakeaways(reviews);
    
    if (!takeaways) {
      console.log('Failed to generate takeaways');
      return null;
    }
    
    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Store in database
    const newTakeaway: ReviewTakeaways = {
      listing_id: listingId,
      positive_takeaway: takeaways.positive || null,
      negative_takeaway: takeaways.negative || null,
      summary_takeaway: takeaways.summary || null,
      expires_at: expiresAt.toISOString()
    };
    
    const { data: savedTakeaway, error: saveError } = await supabase
      .from('review_takeaways')
      .insert([newTakeaway])
      .select()
      .single();
    
    if (saveError) {
      console.error('Error saving takeaways:', saveError);
      // Return the generated takeaways even if saving failed
      return newTakeaway;
    }
    
    return savedTakeaway;
  } catch (error) {
    console.error('Error in findOrGenerateReviewTakeaways:', error);
    return null;
  }
}

/**
 * Generate takeaways from reviews using AI
 */
async function generateTakeaways(reviews: Review[]): Promise<{ positive: string | null; negative: string | null; summary: string | null } | null> {
  if (reviews.length === 0) return null;
  
  const maxRetries = 3;
  const baseDelay = 2000; // 2 seconds
  
  // Group reviews by rating
  const positiveReviews = reviews.filter(r => r.rating >= 4);
  const negativeReviews = reviews.filter(r => r.rating <= 3);
  
  // Prepare review texts for each group
  const positiveTexts = positiveReviews.map(r => `"${r.text}" - Rating: ${r.rating}/5`).join('\n\n');
  const negativeTexts = negativeReviews.map(r => `"${r.text}" - Rating: ${r.rating}/5`).join('\n\n');
  const allTexts = reviews.map(r => `"${r.text}" - Rating: ${r.rating}/5`).join('\n\n');
  
  // Initialize results
  let positiveTakeaway: string | null = null;
  let negativeTakeaway: string | null = null;
  let summaryTakeaway: string | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add delay between requests, increasing with each retry
      if (attempt > 0) {
        await delay(baseDelay * Math.pow(2, attempt));
      }
      
      // Generate positive takeaway if we have positive reviews
      if (positiveTexts && positiveTexts.length > 0) {
        const positivePrompt = `
          Analyze these positive reviews (4-5 stars) about an Airbnb property and create a concise 1-2 sentence takeaway that summarizes the positive safety aspects.
          Focus on what makes the area or property safe according to these reviews.
          Return ONLY the takeaway text with no additional formatting, quotes, or prefixes.
          
          Reviews:
          ${positiveTexts.substring(0, 1500)} // Limit text length
        `;
        
        const positiveResult = await model.generateContent(positivePrompt);
        const positiveText = positiveResult.response.text().trim();
        
        // Remove any markdown formatting or quotes
        positiveTakeaway = positiveText
          .replace(/^["']|["']$/g, '') // Remove surrounding quotes
          .replace(/^#+\s+/g, '') // Remove markdown headers
          .replace(/^Takeaway:\s*/i, '') // Remove "Takeaway:" prefix
          .trim();
      }
      
      // Generate negative takeaway if we have negative reviews
      if (negativeTexts && negativeTexts.length > 0) {
        const negativePrompt = `
          Analyze these negative reviews (1-3 stars) about an Airbnb property and create a concise 1-2 sentence takeaway that summarizes the safety concerns.
          Focus on specific safety issues mentioned repeatedly.
          Return ONLY the takeaway text with no additional formatting, quotes, or prefixes.
          
          Reviews:
          ${negativeTexts.substring(0, 1500)} // Limit text length
        `;
        
        const negativeResult = await model.generateContent(negativePrompt);
        const negativeText = negativeResult.response.text().trim();
        
        // Remove any markdown formatting or quotes
        negativeTakeaway = negativeText
          .replace(/^["']|["']$/g, '') // Remove surrounding quotes
          .replace(/^#+\s+/g, '') // Remove markdown headers
          .replace(/^Takeaway:\s*/i, '') // Remove "Takeaway:" prefix
          .trim();
      }
      
      // Generate summary takeaway from all reviews
      if (allTexts && allTexts.length > 0) {
        const summaryPrompt = `
          Analyze these reviews about an Airbnb property and create a concise 1-2 sentence summary takeaway about the overall safety impression.
          Include the average rating and any consistent themes about safety.
          Return ONLY the takeaway text with no additional formatting, quotes, or prefixes.
          
          Reviews:
          ${allTexts.substring(0, 1500)} // Limit text length
        `;
        
        const summaryResult = await model.generateContent(summaryPrompt);
        const summaryText = summaryResult.response.text().trim();
        
        // Remove any markdown formatting or quotes
        summaryTakeaway = summaryText
          .replace(/^["']|["']$/g, '') // Remove surrounding quotes
          .replace(/^#+\s+/g, '') // Remove markdown headers
          .replace(/^Takeaway:\s*/i, '') // Remove "Takeaway:" prefix
          .trim();
      }
      
      // If we have at least one takeaway, return the results
      if (positiveTakeaway || negativeTakeaway || summaryTakeaway) {
        return {
          positive: positiveTakeaway,
          negative: negativeTakeaway,
          summary: summaryTakeaway
        };
      }
      
    } catch (error: any) {
      console.error(`Error generating takeaways (attempt ${attempt + 1}):`, error.message);
      
      // Check if it's a rate limit error
      if (error.message && error.message.includes('rate')) {
        console.log(`Rate limit hit, waiting before retry ${attempt + 1}`);
        await delay(baseDelay * Math.pow(2, attempt));
      }
    }
  }
  
  // If all attempts failed, return null
  return null;
} 