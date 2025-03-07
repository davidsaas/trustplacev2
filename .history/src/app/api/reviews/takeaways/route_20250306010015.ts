import { NextResponse } from 'next/server';
import { findOrGenerateReviewTakeaways } from '@/lib/reviews/processor';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const listingId = url.searchParams.get('listing_id');
    const reviewsParam = url.searchParams.get('reviews');
    
    if (!listingId || !reviewsParam) {
      return NextResponse.json(
        { error: 'listing_id and reviews parameters are required' },
        { status: 400 }
      );
    }
    
    let reviews;
    try {
      reviews = JSON.parse(reviewsParam);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid reviews parameter format' },
        { status: 400 }
      );
    }
    
    const takeaways = await findOrGenerateReviewTakeaways(listingId, reviews);
    
    if (!takeaways) {
      return NextResponse.json(
        { 
          success: false,
          message: 'No takeaways could be generated for this listing'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      takeaways,
    });
  } catch (error) {
    console.error('Error fetching review takeaways:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review takeaways' },
      { status: 500 }
    );
  }
}

// Cache results for 1 hour
export const revalidate = 3600; 