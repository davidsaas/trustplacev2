import { NextRequest, NextResponse } from 'next/server';
import { findNearbyInsights } from '@/lib/safety-insights/processor';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const latitude = parseFloat(searchParams.get('latitude') || '');
    const longitude = parseFloat(searchParams.get('longitude') || '');
    const radius = parseFloat(searchParams.get('radius') || '2'); // Default 2km
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude parameters are required' },
        { status: 400 }
      );
    }
    
    const insights = await findNearbyInsights(latitude, longitude, radius);
    
    return NextResponse.json({
      success: true,
      count: insights.length,
      insights,
    });
  } catch (error) {
    console.error('Error fetching nearby safety insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nearby safety insights' },
      { status: 500 }
    );
  }
}

// Cache results for 1 hour
export const revalidate = 3600; 