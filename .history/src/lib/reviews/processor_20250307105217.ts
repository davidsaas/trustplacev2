import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase-types';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

type ReviewTakeaway = Database['public']['Tables']['review_takeaways']['Row'];

interface Review {
  id: string;
  text: string;
  date: string;
  rating: number;
  author: string;
  authorImage?: string;
}

interface GeminiReviewAnalysis {
  safetyReviews: {
    review: Review;
    safetyContext: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }[];
  takeaways: {
    positive: string | null;
    negative: string | null;
  };
}

/**
 * Analyze reviews using Gemini to extract safety-related content and generate takeaways
 */
async function analyzeReviewsWithGemini(reviews: Review[]): Promise<GeminiReviewAnalysis | null> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY environment variable');
      return {
        safetyReviews: [],
        takeaways: {
          positive: "No specific safety praise was identified in the available reviews.",
          negative: "No specific safety concerns were identified in the available reviews."
        }
      };
    }

    const prompt = `Analyze these Airbnb reviews and identify ONLY reviews that explicitly mention safety-related aspects. Focus only on concrete safety observations rather than general comments.
    For each safety-related review, explain what specific safety context is mentioned.
    Be conservative in your analysis - only include reviews that explicitly mention safety aspects.
    If a review is not clearly about safety, do not include it.

    Then generate two lists of specific, granular safety takeaways:
    1. "What's Good" - Safety positives mentioned in the reviews (e.g., "Well-lit streets at night", "Secure building access")
    2. "Watch Out For" - Safety concerns mentioned in the reviews (e.g., "Loud noise from nearby highway", "Limited parking options")

    Each takeaway should be a specific, actionable point. Format these as separate sentences, not as bullet points or numbered lists.
    Make each point explicit, concrete and specific - avoid generic statements.
    If no safety positives or concerns are mentioned, return null for that section.

    Reviews to analyze:
    ${reviews.map(r => `Review by ${r.author} (${r.rating} stars): "${r.text}"`).join('\n\n')}

    Format your response exactly like this example:
    {
      "safetyReviews": [
        {
          "review": {original review object},
          "safetyContext": "Mentions well-lit streets and secure building entrance",
          "sentiment": "positive"
        }
      ],
      "takeaways": {
        "positive": "Streets are well-lit at night. Building has 24/7 security personnel. Neighborhood has regular police patrols. Area is quiet after 10pm.",
        "negative": "Some homeless people in the nearby park. Back alley is poorly lit. Weekend nights can be noisy from nearby bars."
      }
    }`;

    console.log('Calling Gemini API with prompt:', prompt.substring(0, 100) + '...');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    console.log('Gemini API response:', text.substring(0, 100) + '...');
    
    try {
      const analysis = JSON.parse(text);
      
      // Validate the response structure
      if (!analysis.safetyReviews || !analysis.takeaways) {
        console.error('Invalid response structure from Gemini API:', text);
        throw new Error('Invalid response structure');
      }
      
      return analysis;
    } catch (e) {
      console.error('Error parsing Gemini response:', e, 'Raw response:', text);
      return {
        safetyReviews: [],
        takeaways: {
          positive: "No specific safety praise was identified in the available reviews.",
          negative: "No specific safety concerns were identified in the available reviews."
        }
      };
    }
  } catch (error) {
    console.error('Error analyzing reviews with Gemini:', error);
    return {
      safetyReviews: [],
      takeaways: {
        positive: "No specific safety praise was identified in the available reviews.",
        negative: "No specific safety concerns were identified in the available reviews."
      }
    };
  }
}

/**
 * Find or generate review takeaways for a listing
 */
export async function findOrGenerateReviewTakeaways(
  listingId: string,
  reviews: Review[]
): Promise<ReviewTakeaway | null> {
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
      console.log('Found existing review takeaways');
      return existingTakeaways;
    }
    
    if (!reviews || reviews.length === 0) {
      console.log('No reviews provided, cannot generate takeaways');
      // Return a fallback review takeaway with generic safety information
      return createFallbackTakeaway(listingId, []);
    }
    
    // Use Gemini to analyze reviews
    const analysis = await analyzeReviewsWithGemini(reviews);
    
    if (!analysis) {
      console.log('Failed to analyze reviews with Gemini');
      // Return a fallback review takeaway
      return createFallbackTakeaway(listingId, reviews);
    }
    
    // Format takeaways for better display - ensure they end with periods
    // and are formatted in a way that works with our new UI
    if (analysis.takeaways.positive) {
      analysis.takeaways.positive = formatTakeawayForDisplay(analysis.takeaways.positive);
    }
    
    if (analysis.takeaways.negative) {
      analysis.takeaways.negative = formatTakeawayForDisplay(analysis.takeaways.negative);
    }
    
    // Calculate average rating
    const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
    
    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Store in database
    const newTakeaway: Omit<ReviewTakeaway, 'id' | 'created_at'> = {
      listing_id: listingId,
      positive_takeaway: analysis.takeaways.positive,
      negative_takeaway: analysis.takeaways.negative,
      review_summary: null,
      average_rating: averageRating,
      review_count: reviews.length,
      expires_at: expiresAt.toISOString()
    };
    
    const { data: savedTakeaway, error: saveError } = await supabase
      .from('review_takeaways')
      .insert([newTakeaway])
      .select()
      .single();
    
    if (saveError) {
      console.error('Error saving review takeaways:', saveError);
      return {
        id: 'temp',
        created_at: new Date().toISOString(),
        ...newTakeaway
      };
    }
    
    return savedTakeaway;
  } catch (error) {
    console.error('Error in findOrGenerateReviewTakeaways:', error);
    // Return a fallback review takeaway
    return createFallbackTakeaway(listingId, reviews);
  }
}

/**
 * Create a fallback review takeaway when the API fails
 */
function createFallbackTakeaway(listingId: string, reviews: Review[]): ReviewTakeaway {
  let averageRating = 0;
  if (reviews && reviews.length > 0) {
    averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
  }
  
  // Calculate expiration date (30 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  
  const fallbackPositive = "No specific safety praise was identified in the available reviews.";
  const fallbackNegative = "No specific safety concerns were identified in the available reviews.";
  
  return {
    id: `temp-${Date.now()}`,
    listing_id: listingId,
    positive_takeaway: fallbackPositive,
    negative_takeaway: fallbackNegative,
    review_summary: null,
    average_rating: averageRating || 4.5,
    review_count: reviews.length,
    created_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString()
  };
}

// Helper function to format takeaways for display
function formatTakeawayForDisplay(takeaway: string | null): string | null {
  if (!takeaway) return null;

  // Ensure the takeaway ends with a period
  const cleanTakeaway = takeaway.trim();
  const endsWithPeriod = cleanTakeaway.endsWith('.');
  
  // Add period if missing
  const formattedTakeaway = endsWithPeriod ? cleanTakeaway : `${cleanTakeaway}.`;
  
  return formattedTakeaway;
}

export { analyzeReviewsWithGemini }; 