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
    summary: string | null;
  };
}

/**
 * Analyze reviews using Gemini to extract safety-related content and generate takeaways
 */
async function analyzeReviewsWithGemini(reviews: Review[]): Promise<GeminiReviewAnalysis | null> {
  try {
    const prompt = `Analyze these Airbnb reviews and identify safety-related comments. For each safety-related review, explain the safety context.
    Then provide overall takeaways about the location's safety.

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
        "positive": "Multiple guests praised the well-lit streets and secure building access",
        "negative": "Some concerns about late-night noise and occasional suspicious activity",
        "summary": "Generally considered safe, with some typical urban precautions advised"
      }
    }`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    try {
      const analysis = JSON.parse(text);
      
      // Validate the response structure
      if (!analysis.safetyReviews || !analysis.takeaways) {
        throw new Error('Invalid response structure');
      }
      
      return analysis;
    } catch (e) {
      console.error('Error parsing Gemini response:', e);
      return null;
    }
  } catch (error) {
    console.error('Error analyzing reviews with Gemini:', error);
    return null;
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
      return null;
    }
    
    // Use Gemini to analyze reviews
    const analysis = await analyzeReviewsWithGemini(reviews);
    
    if (!analysis) {
      console.log('Failed to analyze reviews with Gemini');
      return null;
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
      review_summary: analysis.takeaways.summary,
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
    return null;
  }
}

export { analyzeReviewsWithGemini }; 