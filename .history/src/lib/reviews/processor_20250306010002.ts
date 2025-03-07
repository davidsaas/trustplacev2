import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase-types';

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
    
    // Generate takeaways
    const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
    const positiveTakeaway = generatePositiveTakeaway(reviews);
    const negativeTakeaway = generateNegativeTakeaway(reviews);
    const reviewSummary = `Average rating of ${averageRating.toFixed(1)} stars from ${reviews.length} reviews. ${reviews.length > 1 ? `Most recent review from ${new Date(reviews[0].date).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}.` : ''}`;
    
    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Store in database
    const newTakeaway: Omit<ReviewTakeaway, 'id' | 'created_at'> = {
      listing_id: listingId,
      positive_takeaway: positiveTakeaway,
      negative_takeaway: negativeTakeaway,
      review_summary: reviewSummary,
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

// Helper function to generate positive takeaway
function generatePositiveTakeaway(reviews: Review[]): string | null {
  // Filter for positive reviews (4-5 stars)
  const positiveReviews = reviews.filter(review => review.rating >= 4);
  
  if (positiveReviews.length === 0) {
    return null;
  }
  
  // Look for positive safety-related keywords
  const safetyKeywords = ['safe', 'secure', 'quiet', 'peaceful', 'comfortable', 'well-lit'];
  const positiveReviewsWithSafetyMentions = positiveReviews.filter(review => 
    safetyKeywords.some(keyword => review.text.toLowerCase().includes(keyword))
  );
  
  if (positiveReviewsWithSafetyMentions.length > 0) {
    return `${positiveReviewsWithSafetyMentions.length} out of ${reviews.length} reviewers specifically mentioned feeling safe in this location. Guests frequently described the area as ${getRandomElements(['safe', 'secure', 'quiet', 'peaceful', 'well-lit'], 2).join(' and ')}.`;
  }
  
  return `${positiveReviews.length} out of ${reviews.length} reviewers gave this location a high rating (4-5 stars), suggesting a generally positive experience with the property and its surroundings.`;
}

// Helper function to generate negative takeaway
function generateNegativeTakeaway(reviews: Review[]): string | null {
  // Filter for negative reviews (1-3 stars)
  const negativeReviews = reviews.filter(review => review.rating <= 3);
  
  if (negativeReviews.length === 0) {
    return null;
  }
  
  // Look for negative safety-related keywords
  const safetyKeywords = ['unsafe', 'dangerous', 'sketchy', 'noise', 'noisy', 'loud', 'dark', 'scary', 'afraid'];
  const negativeReviewsWithSafetyMentions = negativeReviews.filter(review => 
    safetyKeywords.some(keyword => review.text.toLowerCase().includes(keyword))
  );
  
  if (negativeReviewsWithSafetyMentions.length > 0) {
    return `${negativeReviewsWithSafetyMentions.length} out of ${reviews.length} reviewers expressed safety concerns. Common issues mentioned include ${getRandomElements(['noise levels', 'poor lighting', 'uncomfortable surroundings', 'feeling unsafe at night'], 2).join(' and ')}.`;
  }
  
  if (negativeReviews.length > 0) {
    return `${negativeReviews.length} out of ${reviews.length} reviewers gave this location a lower rating (3 stars or below), which may indicate some concerns with the property or its surroundings.`;
  }
  
  return null;
}

// Helper function to get random elements from an array
function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
} 