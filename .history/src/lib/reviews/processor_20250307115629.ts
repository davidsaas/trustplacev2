import type { Database } from '@/lib/supabase-types';
import { findOrGenerateListingTakeaways } from '@/lib/gemini-takeaways';

type ReviewTakeaway = Database['public']['Tables']['review_takeaways']['Row'];

export interface Review {
  id: string;
  text: string;
  date: string;
  rating: number;
  author: string;
  authorImage?: string;
}

/**
 * Find or generate review takeaways for a listing
 * @param listingId The ID of the listing
 * @param reviews Array of reviews for the listing
 * @returns ReviewTakeaway object or null if an error occurs
 */
export async function findOrGenerateReviewTakeaways(
  listingId: string,
  reviews: Review[]
): Promise<ReviewTakeaway | null> {
  try {
    console.log(`Using unified gemini-takeaways service for listing ${listingId} with ${reviews.length} reviews`);
    
    // Use our new service to find or generate takeaways
    const takeaways = await findOrGenerateListingTakeaways(listingId, reviews);
    
    // Return the takeaways
    return takeaways as ReviewTakeaway;
  } catch (error) {
    console.error('Error in findOrGenerateReviewTakeaways:', error);
    return null;
  }
} 