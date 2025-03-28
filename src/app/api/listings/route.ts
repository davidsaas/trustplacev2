import { NextResponse } from 'next/server';

const LA_DATASET_URL = 'https://api.apify.com/v2/datasets/zaa5uKgGaiCddkejc/items?clean=true&format=json';

// Disable caching for this route since the response is too large
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    // Fetch with no-store to prevent caching
    const response = await fetch(LA_DATASET_URL, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch listings');
    }

    const listings = await response.json();
    
    // Process and transform the data
    const processedListings = listings.map((listing: any) => ({
      id: listing.id,
      title: listing.name,
      url: listing.url,
      location: {
        neighborhood: listing.neighborhood,
        city: 'Los Angeles',
        state: 'CA',
        coordinates: {
          lat: listing.location?.latitude || listing.location?.lat,
          lng: listing.location?.longitude || listing.location?.lng,
        },
      },
      price: {
        amount: listing.pricing?.rate?.amount || null,
        currency: 'USD',
      },
      photos: listing.photos || [],
      description: listing.description,
      host: {
        name: listing.host?.name,
        id: listing.host?.id,
        isSuperhost: listing.host?.isSuperhost,
      },
      amenities: listing.amenities,
      reviews: {
        rating: listing.rating,
        count: listing.reviewsCount,
        details: listing.reviews,
      },
      lastUpdated: new Date().toISOString(),
    }));

    // Return response with no-cache headers
    return new NextResponse(JSON.stringify({
      success: true,
      data: processedListings,
    }), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch listings',
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
} 