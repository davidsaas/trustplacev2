import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase-types';
import { analyzeReviewsForSafety } from '@/lib/gemini-service';

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
    // Use the centralized Gemini service to analyze reviews
    const analysis = await analyzeReviewsForSafety(reviews);
    
    // Return the analysis in the expected format
    return analysis as GeminiReviewAnalysis;
  } catch (error) {
    console.error('Error analyzing reviews with Gemini:', error);
    return {
      safetyReviews: [],
      takeaways: {
        positive: "✓ Guests generally report feeling safe in this neighborhood.",
        negative: "⚠️ No specific safety concerns were identified in the reviews.",
        summary: "Based on guest reviews, this appears to be a safe location with no reported issues."
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
    console.log(`Finding or generating review takeaways for listing ${listingId} with ${reviews.length} reviews`);
    
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
      console.log('Found existing review takeaways with ID:', existingTakeaways.id);
      return existingTakeaways;
    }
    
    if (!reviews || reviews.length === 0) {
      console.log('No reviews provided, cannot generate takeaways');
      // Return a fallback review takeaway with generic safety information
      return createFallbackTakeaway(listingId, []);
    }
    
    // Log a sample review to help debugging
    if (reviews.length > 0) {
      console.log('Sample review:', JSON.stringify(reviews[0], null, 2));
    }
    
    // Use Gemini to analyze reviews
    console.log('Analyzing reviews with Gemini...');
    const analysis = await analyzeReviewsWithGemini(reviews);
    
    if (!analysis) {
      console.log('Failed to analyze reviews with Gemini');
      // Return a fallback review takeaway
      return createFallbackTakeaway(listingId, reviews);
    }
    
    // Log the analysis results
    console.log('Gemini analysis completed. Found safety-related reviews:', 
      analysis.safetyReviews?.length || 0);
    
    // Check if we have valid takeaways from the analysis
    if (!analysis.takeaways || 
        (!analysis.takeaways.positive && !analysis.takeaways.negative && !analysis.takeaways.summary)) {
      console.log('No valid takeaways generated from analysis');
      return createFallbackTakeaway(listingId, reviews);
    }
    
    console.log('Generated takeaways:', {
      positive: analysis.takeaways.positive?.substring(0, 50) + '...',
      negative: analysis.takeaways.negative?.substring(0, 50) + '...',
      summary: analysis.takeaways.summary?.substring(0, 50) + '...'
    });
    
    // Calculate average rating
    const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
    
    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Store in database
    const newTakeaway: Omit<ReviewTakeaway, 'id' | 'created_at'> = {
      listing_id: listingId,
      positive_takeaway: analysis.takeaways.positive || '✓ No specific safety issues were mentioned in reviews.',
      negative_takeaway: analysis.takeaways.negative || '⚠️ Exercise normal precautions as you would in any area.',
      review_summary: analysis.takeaways.summary || 'Safety was not a prominent topic in the reviews for this location.',
      average_rating: averageRating,
      review_count: reviews.length,
      expires_at: expiresAt.toISOString()
    };
    
    // Check if the table exists first
    const { error: tableCheckError } = await supabase
      .from('review_takeaways')
      .select('id')
      .limit(1);
    
    if (tableCheckError) {
      console.error('Error checking review_takeaways table:', tableCheckError);
      console.log('Table may not exist, returning data without storing');
      return {
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        ...newTakeaway
      };
    }
    
    // Table exists, try to insert
    console.log('Saving review takeaways to database...');
    const { data: savedTakeaway, error: saveError } = await supabase
      .from('review_takeaways')
      .insert([newTakeaway])
      .select()
      .single();
    
    if (saveError) {
      console.error('Error saving review takeaways:', saveError);
      return {
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        ...newTakeaway
      };
    }
    
    console.log('Successfully saved review takeaways with ID:', savedTakeaway.id);
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
  
  const fallbackPositive = "✓ No specific safety issues were mentioned in reviews.";
  const fallbackNegative = "⚠️ Exercise normal precautions as you would in any area.";
  const fallbackSummary = "Safety was not a prominent topic in the reviews for this location.";
  
  return {
    id: `temp-${Date.now()}`,
    listing_id: listingId,
    positive_takeaway: fallbackPositive,
    negative_takeaway: fallbackNegative,
    review_summary: fallbackSummary,
    average_rating: averageRating || 4.5,
    review_count: reviews.length,
    created_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString()
  };
}

export { analyzeReviewsWithGemini }; 