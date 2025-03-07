import { NextResponse } from 'next/server';
import { findOrGenerateTakeaways } from '@/lib/safety-insights/processor';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const latitude = parseFloat(url.searchParams.get('latitude') || '');
    const longitude = parseFloat(url.searchParams.get('longitude') || '');
    const radius = parseFloat(url.searchParams.get('radius') || '2'); // Default 2km
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude parameters are required' },
        { status: 400 }
      );
    }
    
    const takeaways = await findOrGenerateTakeaways(latitude, longitude, radius);
    
    if (!takeaways) {
      return NextResponse.json(
        { 
          success: false,
          message: 'No takeaways could be generated for this location'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      takeaways,
    });
  } catch (error) {
    console.error('Error fetching safety takeaways:', error);
    return NextResponse.json(
      { error: 'Failed to fetch safety takeaways' },
      { status: 500 }
    );
  }
}

// Cache results for 1 hour
export const revalidate = 3600; 