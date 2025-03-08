import { NextRequest, NextResponse } from 'next/server';
import { getSafetyMetricsForLocation } from '@/lib/safety-insights/processor';

export async function GET(request: NextRequest) {
  try {
    // Get params from query string
    const searchParams = request.nextUrl.searchParams;
    const latitude = parseFloat(searchParams.get('latitude') || '0');
    const longitude = parseFloat(searchParams.get('longitude') || '0');
    const city = searchParams.get('city') || 'Los Angeles'; // Default to LA
    
    // Validate params
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid latitude and longitude parameters'
      }, { status: 400 });
    }
    
    // Get safety metrics for this location
    const metrics = await getSafetyMetricsForLocation(latitude, longitude, city);
    
    if (!metrics) {
      return NextResponse.json({
        success: false,
        message: 'No safety metrics found for this location'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error processing safety metrics request:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
} 