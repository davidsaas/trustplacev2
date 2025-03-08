import { NextResponse } from 'next/server';
import { getSafetyData } from '@/lib/safety-insights/processor';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const latitude = parseFloat(url.searchParams.get('latitude') || '');
    const longitude = parseFloat(url.searchParams.get('longitude') || '');
    const radius = parseFloat(url.searchParams.get('radius') || '2'); // Default 2km
    const city = url.searchParams.get('city') || 'Los Angeles';
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude parameters are required' },
        { status: 400 }
      );
    }
    
    // Use the combined safety data function which includes metrics, insights and takeaways
    const safetyData = await getSafetyData(latitude, longitude, city);
    
    // Return metrics, insights, and takeaways in one response
    return NextResponse.json({
      success: true,
      ...safetyData,
      count: safetyData.insights?.length || 0
    });
  } catch (error) {
    console.error('Error fetching safety data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch safety data' },
      { status: 500 }
    );
  }
}

// Cache results for 1 hour
export const revalidate = 3600; 