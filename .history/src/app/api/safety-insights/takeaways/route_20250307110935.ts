import { NextResponse } from 'next/server';
import { findOrGenerateTakeaways } from '@/lib/safety-insights/processor';

/**
 * Create fallback takeaways for safety insights
 */
function createFallbackTakeaway(latitude: number, longitude: number, radius: number) {
  return {
    id: `temp-${Date.now()}`,
    latitude,
    longitude,
    radius,
    positive_takeaway: "This area has not yet received enough safety-specific comments to generate detailed safety insights. As more users contribute safety information, we'll update these takeaways with specific details about what makes this location safe.",
    negative_takeaway: "We don't have enough safety-related comments about this location to identify specific concerns. As with any area, it's recommended to stay aware of your surroundings and follow standard safety precautions when visiting unfamiliar places.",
    neutral_takeaway: "TrustPlace is continuously collecting safety data for this area. Check back soon as more users contribute safety information to get more detailed insights about this location.",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
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
    
    console.log('Fetching safety takeaways for:', { latitude, longitude, radius });
    
    // Set up a timeout for the API call (30 seconds)
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), 30000)
    );
    
    // Add a timeout to the API call
    let takeaways;
    try {
      const takeawaysPromise = findOrGenerateTakeaways(latitude, longitude, radius);
      takeaways = await Promise.race([takeawaysPromise, timeout]);
      console.log('Received takeaways:', takeaways ? 'success' : 'null');
    } catch (error) {
      console.error('Timeout or error in API call:', error);
      takeaways = null;
    }
    
    if (!takeaways) {
      console.log('No takeaways generated, returning fallback for:', { latitude, longitude, radius });
      // Return fallback takeaways instead of 404
      return NextResponse.json({
        success: true,
        takeaways: createFallbackTakeaway(latitude, longitude, radius)
      });
    }
    
    // Remove the neutral takeaway since we don't display it anymore
    if (takeaways && typeof takeaways === 'object' && 'neutral_takeaway' in takeaways) {
      takeaways.neutral_takeaway = null;
    }
    
    console.log('Returning takeaways with positive length:', 
      takeaways && typeof takeaways === 'object' && 'positive_takeaway' in takeaways && 
      typeof takeaways.positive_takeaway === 'string' ? takeaways.positive_takeaway.length : 0);
    
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
    
    console.log('Error scenario, returning fallback takeaways');
    
    // Return fallback takeaways instead of 500
    return NextResponse.json({
      success: true,
      takeaways: createFallbackTakeaway(latitude, longitude, radius)
    });
  }
}

// Cache results for 1 hour
export const revalidate = 3600; 