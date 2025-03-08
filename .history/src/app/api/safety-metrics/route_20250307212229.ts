import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET handler for the /api/safety-metrics endpoint
 * Fetches safety metrics for a district/city or using lat/lng coordinates
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');
    const district = searchParams.get('district');
    const city = searchParams.get('city') || 'Los Angeles'; // Default to LA
    
    // If lat/lng are provided, find the nearest district
    if (latitude && longitude) {
      // Convert to numbers
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json(
          { success: false, error: 'Invalid latitude or longitude format' },
          { status: 400 }
        );
      }
      
      // Use the find_la_district function to get the nearest district
      const { data: districtData, error: districtError } = await supabase.rpc(
        'find_la_district',
        { lat, lng }
      );
      
      if (districtError) {
        console.error('Error finding district:', districtError);
        return NextResponse.json(
          { success: false, error: 'Error finding district' },
          { status: 500 }
        );
      }
      
      // If no district found, return error
      if (!districtData || !districtData.district) {
        return NextResponse.json(
          { success: false, error: 'No district found near these coordinates' },
          { status: 404 }
        );
      }
      
      // Get the safety metrics for this district
      const { data: metricsData, error: metricsError } = await supabase
        .from('safety_metrics')
        .select('*')
        .eq('district', districtData.district)
        .eq('city', city)
        .single();
      
      if (metricsError) {
        console.error('Error fetching metrics:', metricsError);
        return NextResponse.json(
          { success: false, error: 'Error fetching safety metrics' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        district: districtData.district,
        distanceKm: districtData.distance_km,
        metrics: metricsData.metrics,
        lastUpdated: metricsData.lastUpdated
      });
    }
    
    // If district is provided directly, use that
    else if (district) {
      const { data, error } = await supabase
        .from('safety_metrics')
        .select('*')
        .eq('district', district)
        .eq('city', city)
        .single();
      
      if (error) {
        console.error('Error fetching metrics:', error);
        return NextResponse.json(
          { success: false, error: 'Error fetching safety metrics' },
          { status: 500 }
        );
      }
      
      if (!data) {
        return NextResponse.json(
          { success: false, error: 'No metrics found for this district' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        district: data.district,
        metrics: data.metrics,
        lastUpdated: data.lastUpdated
      });
    }
    
    // If neither lat/lng nor district provided, return error
    else {
      return NextResponse.json(
        { success: false, error: 'Must provide either latitude/longitude or district name' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in safety metrics API:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 