import { NextResponse } from 'next/server';

const LA_DATASET_URL = 'https://api.apify.com/v2/datasets/zaa5uKgGaiCddkejc/items?clean=true&format=json';

export async function GET() {
  try {
    const response = await fetch(LA_DATASET_URL);
    
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
        amount: listing.price,
        currency: 'USD',
      },
      photos: listing.images?.map((image: any) => ({
        caption: image.caption || '',
        id: image.id || Math.random(),
        large: image.pictureUrl || image.url || '',
        previewEncodedPng: image.thumbnailUrl || '',
        scrimColor: image.scrimColor || '',
        isProfessional: image.isProfessional || false,
        pictureOrientation: image.pictureOrientation || 'landscape',
        aspectRatio: image.aspectRatio || 1.5,
      })) || [],
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

    return NextResponse.json({
      success: true,
      data: processedListings,
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch listings',
      },
      { status: 500 }
    );
  }
} 