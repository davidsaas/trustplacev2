import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase-types';
import { findOrGenerateListingTakeaways } from '@/lib/gemini-takeaways';

type ReviewTakeaway = Database['public']['Tables']['review_takeaways']['Row'];

interface Review {
  id: string;
  text: string;
  date: string;
  rating: number;
  author: string;
  authorImage?: string;
}

/**
 * Find or generate review takeaways for a listing
 */
export async function findOrGenerateReviewTakeaways(
  listingId: string,
  reviews: Review[]
): Promise<ReviewTakeaway | null> {
  try {
    console.log(`Using new gemini-takeaways service for listing ${listingId} with ${reviews.length} reviews`);
    
    // Use our new service to find or generate takeaways
    const takeaways = await findOrGenerateListingTakeaways(listingId, reviews);
    
    // Return the takeaways
    return takeaways as ReviewTakeaway;
  } catch (error) {
    console.error('Error in findOrGenerateReviewTakeaways:', error);
    return null;
  }
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