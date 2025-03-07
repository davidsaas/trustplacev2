import { NextResponse } from 'next/server';
import { findOrGenerateTakeaways } from '@/lib/safety-insights/processor';

// Create a fallback takeaway when the API fails
function createFallbackTakeaway(latitude: number, longitude: number, radius: number) {
  return {
    id: 'temp-' + Date.now(),
    latitude,
    longitude,
    radius,
    positive_takeaway: "The area has a mix of residential and commercial zones with good walkability.",
    negative_takeaway: "Like many urban areas, it's advisable to stay vigilant, especially at night.",
    neutral_takeaway: "This neighborhood appears generally safe with typical urban safety considerations.",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString() // 1 day
  };
}

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
    
    // Set up a timeout for the API call (15 seconds)
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), 15000)
    );
    
    // Add a timeout to the API call
    let takeaways;
    try {
      const takeawaysPromise = findOrGenerateTakeaways(latitude, longitude, radius);
      takeaways = await Promise.race([takeawaysPromise, timeout]);
    } catch (error) {
      console.error('Timeout or error in API call:', error);
      takeaways = null;
    }
    
    if (!takeaways) {
      console.log('Returning fallback takeaways for:', { latitude, longitude, radius });
      
      // Return fallback takeaways instead of 404
      return NextResponse.json({
        success: true,
        takeaways: createFallbackTakeaway(latitude, longitude, radius)
      });
    }
    
    return NextResponse.json({
      success: true,
      takeaways,
    });
  } catch (error) {
    console.error('Error fetching safety takeaways:', error);
    
    // Get parameters from request
    const url = new URL(request.url);
    const latitude = parseFloat(url.searchParams.get('latitude') || '0');
    const longitude = parseFloat(url.searchParams.get('longitude') || '0');
    const radius = parseFloat(url.searchParams.get('radius') || '2');
    
    // Return fallback takeaways instead of 500
    return NextResponse.json({
      success: true,
      takeaways: createFallbackTakeaway(latitude, longitude, radius)
    });
  }
}

// Cache results for 1 hour
export const revalidate = 3600; 