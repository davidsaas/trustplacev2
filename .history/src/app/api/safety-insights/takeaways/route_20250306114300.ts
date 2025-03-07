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
    // Query the database for existing takeaways
    const { data: existingTakeaways, error: queryError } = await supabase
      .from('safety_takeaways')
      .select('*')
      .eq('latitude', latitude)
      .eq('longitude', longitude)
      .eq('radius', radius)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingTakeaways) {
      return NextResponse.json({
        success: true,
        takeaways: existingTakeaways
      });
    }

    // If no existing takeaways, generate new ones based on nearby insights
    const { data: nearbyInsights, error: insightsError } = await supabase
      .from('safety_insights')
      .select('*')
      .gte('safety_score', 0)
      .order('created_at', { ascending: false })
      .limit(50);

    if (insightsError) {
      throw insightsError;
    }

    // Process insights to generate takeaways
    const positiveInsights = nearbyInsights?.filter(i => i.sentiment === 'positive') || [];
    const negativeInsights = nearbyInsights?.filter(i => i.sentiment === 'negative') || [];
    const neutralInsights = nearbyInsights?.filter(i => i.sentiment === 'neutral') || [];

    const takeaways = {
      latitude,
      longitude,
      radius,
      positive_takeaway: positiveInsights.length > 0 
        ? "The area generally receives positive feedback regarding safety, particularly during daytime hours."
        : null,
      negative_takeaway: negativeInsights.length > 0
        ? "Some residents have expressed concerns about safety in certain parts of the neighborhood."
        : null,
      neutral_takeaway: "Exercise normal precautions as you would in any urban area.",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Expires in 7 days
    };

    // Store the new takeaways
    const { data: newTakeaways, error: insertError } = await supabase
      .from('safety_takeaways')
      .insert([takeaways])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      takeaways: newTakeaways
    });

  } catch (error) {
    console.error('Error processing safety takeaways:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process safety takeaways' },
      { status: 500 }
    );
  }
}

// Cache results for 1 hour
export const revalidate = 3600; 