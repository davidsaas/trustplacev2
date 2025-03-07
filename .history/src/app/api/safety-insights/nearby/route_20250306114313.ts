import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = parseFloat(searchParams.get('latitude') || '0');
  const longitude = parseFloat(searchParams.get('longitude') || '0');
  const radius = parseFloat(searchParams.get('radius') || '2');

  if (!latitude || !longitude) {
    return NextResponse.json(
      { success: false, error: 'Invalid coordinates' },
      { status: 400 }
    );
  }

  try {
    // Query nearby safety insights from the database
    // Note: This is a simplified query. In a production environment,
    // you would want to use PostGIS or similar to calculate actual distances
    const { data: insights, error } = await supabase
      .from('safety_insights')
      .select('*')
      .gte('safety_score', 0)
      // Add more sophisticated location filtering here if needed
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      insights: insights || []
    });

  } catch (error) {
    console.error('Error fetching nearby safety insights:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch safety insights' },
      { status: 500 }
    );
  }
}

// Cache results for 1 hour
export const revalidate = 3600; 