import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Interface for review takeaways
interface ReviewTakeaway {
  id?: string;
  listing_id: string;
  positive_takeaway: string | null;
  negative_takeaway: string | null;
  summary_takeaway: string | null;
  created_at?: string;
  expires_at?: string;
}

// GET endpoint to retrieve takeaways for a specific listing
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const listingId = url.searchParams.get('listing_id');
    
    if (!listingId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing listing_id parameter' 
      }, { status: 400 });
    }
    
    // Query Supabase for existing takeaways
    const { data, error } = await supabase
      .from('review_takeaways')
      .select('*')
      .eq('listing_id', listingId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error fetching review takeaways:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch review takeaways' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      takeaways: data || null 
    });
    
  } catch (err) {
    console.error('Error in review takeaways GET endpoint:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// POST endpoint to save takeaways for a specific listing
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { listing_id, positive_takeaway, negative_takeaway, summary_takeaway } = body;
    
    if (!listing_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing listing_id parameter' 
      }, { status: 400 });
    }
    
    // Check if takeaways already exist for this listing
    const { data: existingData, error: existingError } = await supabase
      .from('review_takeaways')
      .select('id')
      .eq('listing_id', listing_id)
      .single();
    
    let result;
    
    // Set expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    if (existingData) {
      // Update existing takeaways
      result = await supabase
        .from('review_takeaways')
        .update({
          positive_takeaway,
          negative_takeaway,
          summary_takeaway,
          expires_at: expiresAt.toISOString()
        })
        .eq('id', existingData.id);
    } else {
      // Insert new takeaways
      result = await supabase
        .from('review_takeaways')
        .insert({
          listing_id,
          positive_takeaway,
          negative_takeaway,
          summary_takeaway,
          expires_at: expiresAt.toISOString()
        });
    }
    
    if (result.error) {
      console.error('Error saving review takeaways:', result.error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to save review takeaways' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: existingData ? 'Takeaways updated' : 'Takeaways saved' 
    });
    
  } catch (err) {
    console.error('Error in review takeaways POST endpoint:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 