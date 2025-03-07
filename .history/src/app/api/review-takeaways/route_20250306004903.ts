import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ReviewTakeaway {
  id?: string;
  listing_id: string;
  positive_takeaway: string | null;
  negative_takeaway: string | null;
  summary_takeaway: string | null;
  created_at?: string;
  expires_at?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listing_id');
    
    if (!listingId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing listing_id parameter' 
      }, { status: 400 });
    }
    
    // Check if we have existing takeaways for this listing
    const { data: existingTakeaways, error: fetchError } = await supabase
      .from('review_takeaways')
      .select('*')
      .eq('listing_id', listingId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
      console.error('Error fetching review takeaways:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch review takeaways' 
      }, { status: 500 });
    }
    
    // If we have existing takeaways that haven't expired, return them
    if (existingTakeaways) {
      const expiresAt = new Date(existingTakeaways.expires_at);
      if (expiresAt > new Date()) {
        return NextResponse.json({ 
          success: true, 
          takeaways: existingTakeaways 
        });
      }
    }
    
    // If we don't have takeaways or they've expired, return not found
    return NextResponse.json({ 
      success: false, 
      error: 'No takeaways found for this listing' 
    }, { status: 404 });
  } catch (error) {
    console.error('Error in review takeaways GET:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { listing_id, reviews } = body;
    
    if (!listing_id || !reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }
    
    // Check if we already have takeaways for this listing
    const { data: existingTakeaways, error: fetchError } = await supabase
      .from('review_takeaways')
      .select('*')
      .eq('listing_id', listing_id)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching review takeaways:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch review takeaways' 
      }, { status: 500 });
    }
    
    // If we have existing takeaways that haven't expired, return them
    if (existingTakeaways) {
      const expiresAt = new Date(existingTakeaways.expires_at);
      if (expiresAt > new Date()) {
        return NextResponse.json({ 
          success: true, 
          takeaways: existingTakeaways,
          cached: true
        });
      }
    }
    
    // Generate takeaways using OpenAI
    const takeaways = await generateTakeaways(reviews);
    
    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Prepare the takeaway data
    const takeawayData: ReviewTakeaway = {
      listing_id,
      positive_takeaway: takeaways.positive,
      negative_takeaway: takeaways.negative,
      summary_takeaway: takeaways.summary,
      expires_at: expiresAt.toISOString()
    };
    
    // If we have existing takeaways, update them
    if (existingTakeaways) {
      const { error: updateError } = await supabase
        .from('review_takeaways')
        .update(takeawayData)
        .eq('id', existingTakeaways.id);
      
      if (updateError) {
        console.error('Error updating review takeaways:', updateError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to update review takeaways' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        takeaways: { ...takeawayData, id: existingTakeaways.id } 
      });
    }
    
    // Otherwise, insert new takeaways
    const { data: newTakeaways, error: insertError } = await supabase
      .from('review_takeaways')
      .insert(takeawayData)
      .select()
      .single();
    
    if (insertError) {
      console.error('Error inserting review takeaways:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to insert review takeaways' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      takeaways: newTakeaways 
    });
  } catch (error) {
    console.error('Error in review takeaways POST:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

async function generateTakeaways(reviews: any[]) {
  try {
    // Prepare the reviews for the prompt
    const reviewsText = reviews.map(review => 
      `Review by ${review.author} (${review.rating}/5 stars): "${review.text}"`
    ).join('\n\n');
    
    // Create the prompt for OpenAI
    const prompt = `
      Analyze the following Airbnb reviews for safety-related information:
      
      ${reviewsText}
      
      Based on these reviews, provide three takeaways:
      1. A positive takeaway about safety (if any)
      2. A negative takeaway about safety concerns (if any)
      3. A summary takeaway about the overall safety impression
      
      Format your response as JSON with the following structure:
      {
        "positive": "Positive takeaway text or null if none",
        "negative": "Negative takeaway text or null if none",
        "summary": "Summary takeaway text"
      }
    `;
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant that analyzes Airbnb reviews for safety information and provides concise, balanced takeaways." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    
    const takeaways = JSON.parse(content);
    return {
      positive: takeaways.positive === "null" ? null : takeaways.positive,
      negative: takeaways.negative === "null" ? null : takeaways.negative,
      summary: takeaways.summary
    };
  } catch (error) {
    console.error('Error generating takeaways with OpenAI:', error);
    
    // Fallback to simple takeaways if OpenAI fails
    return generateFallbackTakeaways(reviews);
  }
}

function generateFallbackTakeaways(reviews: any[]) {
  // Calculate average rating
  const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
  
  // Count positive and negative reviews
  const positiveReviews = reviews.filter(review => review.rating >= 4);
  const negativeReviews = reviews.filter(review => review.rating <= 3);
  
  // Generate fallback takeaways
  let positive = null;
  let negative = null;
  let summary = `Average rating of ${averageRating.toFixed(1)} stars from ${reviews.length} reviews.`;
  
  if (positiveReviews.length > 0) {
    positive = `${positiveReviews.length} out of ${reviews.length} reviewers gave this location a high rating (4-5 stars), suggesting a generally positive experience.`;
  }
  
  if (negativeReviews.length > 0) {
    negative = `${negativeReviews.length} out of ${reviews.length} reviewers gave this location a lower rating (3 stars or below), which may indicate some concerns.`;
  }
  
  return { positive, negative, summary };
} 