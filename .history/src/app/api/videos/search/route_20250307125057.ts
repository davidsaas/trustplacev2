import { NextResponse } from 'next/server';
import { searchYouTubeVideos, getYouTubeTranscript, getVideoSafetyTakeaways } from '@/lib/youtube-service';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationName = searchParams.get('location');
    const locationId = searchParams.get('locationId');
    const maxResults = parseInt(searchParams.get('maxResults') || '5', 10);
    
    if (!locationName || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Location name and ID are required' },
        { status: 400 }
      );
    }

    // Create server-side Supabase client
    const supabase = createServerComponentClient({ cookies });
    
    // Check if we have cached videos for this location
    const { data: cachedVideos, error: supabaseError } = await supabase
      .from('video_takeaways')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
      
    if (supabaseError) {
      console.error('Error fetching cached videos:', supabaseError);
    } else if (cachedVideos && cachedVideos.length > 0) {
      // Return cached videos if available
      return NextResponse.json({
        success: true,
        videos: cachedVideos,
        source: 'cache'
      });
    }
    
    // If no cached videos, search YouTube
    const youtubeVideos = await searchYouTubeVideos(locationName, maxResults);
    
    if (youtubeVideos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No videos found for this location'
      });
    }
    
    // Process videos and store them
    const processedVideos = await Promise.all(
      youtubeVideos.map(async (video) => {
        try {
          // Get video transcript and generate takeaways
          const transcript = await getYouTubeTranscript(video.id);
          const takeaways = await getVideoSafetyTakeaways(video, transcript);
          
          // Calculate safety relevance and sentiment
          const relevanceScore = calculateSafetyRelevance(
            takeaways.positive_takeaway,
            takeaways.negative_takeaway,
            takeaways.summary,
            video.title,
            video.description
          );
          
          const sentiment = determineSentiment(
            takeaways.positive_takeaway,
            takeaways.negative_takeaway
          );
          
          // Prepare video data for storage
          const videoData = {
            video_id: video.id,
            title: video.title,
            description: video.description,
            thumbnail_url: video.thumbnail,
            channel_name: video.channelTitle,
            transcript: transcript,
            positive_takeaway: takeaways.positive_takeaway,
            negative_takeaway: takeaways.negative_takeaway,
            summary: takeaways.summary,
            relevance_score: relevanceScore,
            sentiment: sentiment,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 2592000000).toISOString() // 30 days
          };
          
          // Store in database
          const { error: insertError } = await supabase
            .from('video_takeaways')
            .upsert([videoData], {
              onConflict: 'video_id',
              ignoreDuplicates: false
            });
            
          if (insertError) {
            console.error('Error storing video:', insertError);
          }
          
          return videoData;
        } catch (error) {
          console.error(`Error processing video ${video.id}:`, error);
          return null;
        }
      })
    );
    
    // Filter out any failed videos and sort by relevance score
    const validVideos = processedVideos.filter(video => video !== null);
    const sortedVideos = validVideos.sort((a, b) => b.relevance_score - a.relevance_score);
    
    return NextResponse.json({
      success: true,
      videos: sortedVideos,
      source: 'youtube'
    });
  } catch (error) {
    console.error('Error in video search API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search videos' },
      { status: 500 }
    );
  }
}

/**
 * Calculate a relevance score based on the safety content
 */
function calculateSafetyRelevance(
  positiveTakeaway: string | null,
  negativeTakeaway: string | null,
  summary: string | null,
  title: string,
  description: string
): number {
  // Base score
  let score = 0.5;
  
  // Check if there are meaningful takeaways (not just empty or generic)
  if (positiveTakeaway && positiveTakeaway.length > 20) score += 0.1;
  if (negativeTakeaway && negativeTakeaway.length > 20) score += 0.1;
  if (summary && summary.length > 30) score += 0.1;
  
  // Check for specific keywords in title and description
  const safetyKeywords = ['safety', 'safe', 'danger', 'crime', 'neighborhood', 'area', 'district', 'night', 'walking'];
  const titleLower = title.toLowerCase();
  const descriptionLower = description.toLowerCase();
  
  for (const keyword of safetyKeywords) {
    if (titleLower.includes(keyword)) score += 0.05;
    if (descriptionLower.includes(keyword)) score += 0.02;
  }
  
  // Cap score at 1.0
  return Math.min(score, 1.0);
}

/**
 * Determine sentiment based on takeaways
 */
function determineSentiment(
  positiveTakeaway: string | null,
  negativeTakeaway: string | null
): 'positive' | 'neutral' | 'negative' {
  // No content case
  if (!positiveTakeaway && !negativeTakeaway) return 'neutral';
  
  // Only positive case
  if (positiveTakeaway && !negativeTakeaway) return 'positive';
  
  // Only negative case
  if (!positiveTakeaway && negativeTakeaway) return 'negative';
  
  // Both present - count the number of points
  const positivePoints = (positiveTakeaway?.match(/✓/g) || []).length;
  const negativePoints = (negativeTakeaway?.match(/⚠️/g) || []).length;
  
  if (positivePoints > negativePoints) return 'positive';
  if (negativePoints > positivePoints) return 'negative';
  
  // Equal or unable to determine
  return 'neutral';
} 