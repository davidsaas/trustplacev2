import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// YouTube API key should be stored in environment variables
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');
  const listingId = searchParams.get('listing_id');
  
  if (!location) {
    return NextResponse.json(
      { success: false, error: 'Location parameter is required' },
      { status: 400 }
    );
  }

  try {
    // First check if we have cached videos for this location
    if (listingId) {
      const { data: existingVideos, error } = await supabase
        .from('location_videos')
        .select('*')
        .eq('location_id', listingId)
        .gte('expires_at', new Date().toISOString());
      
      if (!error && existingVideos.length > 0) {
        return NextResponse.json({
          success: true,
          data: existingVideos,
          source: 'cache'
        });
      }
    }

    // If no cached videos or they're expired, fetch from YouTube API
    const searchQuery = `${location} travel guide neighborhood safety`;
    const youtubeUrl = `${YOUTUBE_API_URL}?part=snippet&maxResults=5&q=${encodeURIComponent(searchQuery)}&type=video&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(youtubeUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch videos from YouTube API');
    }
    
    const data = await response.json();
    
    // Transform YouTube API response to our format
    const videos = data.items.map((item: any) => ({
      video_id: item.id.videoId,
      title: item.snippet.title,
      channel_name: item.snippet.channelTitle,
      thumbnail_url: item.snippet.thumbnails.high.url,
      summary: '', // Will be filled by the summarize endpoint
      relevance_score: calculateRelevanceScore(item.snippet.title, item.snippet.description, location),
      location_id: listingId || location,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 7 days
    }));
    
    // If we have a listing ID, store these videos in the database
    if (listingId) {
      // Delete any existing videos for this location
      await supabase
        .from('location_videos')
        .delete()
        .eq('location_id', listingId);
      
      // Insert new videos
      for (const video of videos) {
        await supabase
          .from('location_videos')
          .insert([video]);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: videos,
      source: 'youtube'
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch videos',
      },
      { status: 500 }
    );
  }
}

// Simple relevance scoring function
function calculateRelevanceScore(title: string, description: string, location: string): number {
  const locationTerms = location.toLowerCase().split(/[\s,]+/);
  const contentText = (title + ' ' + description).toLowerCase();
  
  // Count how many location terms appear in the content
  const matchCount = locationTerms.filter(term => contentText.includes(term)).length;
  
  // Calculate a base score based on matches
  let score = (matchCount / locationTerms.length) * 5;
  
  // Boost score for videos with certain keywords
  const boostKeywords = ['safety', 'neighborhood', 'travel', 'guide', 'tour', 'review'];
  boostKeywords.forEach(keyword => {
    if (contentText.includes(keyword)) {
      score += 0.5;
    }
  });
  
  // Cap the score at 10
  return Math.min(Math.round(score * 10) / 10, 10);
} 