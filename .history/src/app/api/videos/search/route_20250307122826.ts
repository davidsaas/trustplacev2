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
      .from('location_videos')
      .select('*')
      .eq('location_id', locationId)
      .gt('expires_at', new Date().toISOString())
      .order('relevance_score', { ascending: false });
      
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
    
    // Process videos in parallel - get safety takeaways for each
    const processedVideos = await Promise.all(
      youtubeVideos.map(async (video) => {
        try {
          // Extract video ID - handle different API response formats
          const videoId = typeof video.id === 'object' ? video.id.videoId : video.id;
          
          const videoTitle = video.snippet.title;
          const videoDescription = video.snippet.description;
          const channelTitle = video.snippet.channelTitle;
          
          // Get the best thumbnail URL
          const thumbnailUrl = video.snippet.thumbnails.best?.url || 
                              video.snippet.thumbnails.high?.url || 
                              video.snippet.thumbnails.medium?.url || 
                              video.snippet.thumbnails.default?.url || 
                              `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          
          // Try to get the transcript
          const transcript = await getYouTubeTranscript(videoId);
          console.log(`Transcript for ${videoTitle}: ${transcript ? 'Found' : 'Not available'}`);
          
          // Get safety takeaways using our new unified service
          const { positive_takeaway, negative_takeaway, summary } = await getVideoSafetyTakeaways(
            videoId, 
            locationName
          );
          
          // Calculate a relevance score based on the safety content
          const relevanceScore = calculateSafetyRelevance(
            positive_takeaway,
            negative_takeaway,
            summary,
            videoTitle,
            videoDescription
          );

          // Determine overall sentiment based on the balance of positive vs negative points
          const sentiment = determineSentiment(positive_takeaway, negative_takeaway);

          // Set expiration date to 30 days from now
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          // Store video in Supabase
          const { data, error } = await supabase
            .from('location_videos')
            .upsert({
              location_id: locationId,
              video_id: videoId,
              title: videoTitle,
              channel_name: channelTitle,
              thumbnail_url: thumbnailUrl,
              summary,
              sentiment,
              relevance_score: relevanceScore,
              expires_at: expiresAt.toISOString()
            }, {
              onConflict: 'location_id,video_id'
            })
            .select()
            .single();

          if (error) {
            console.error('Error storing video in Supabase:', error);
            // Return a fallback response if storage fails
            return {
              id: crypto.randomUUID(),
              location_id: locationId,
              video_id: videoId,
              title: videoTitle,
              channel_name: channelTitle,
              thumbnail_url: thumbnailUrl,
              summary,
              sentiment,
              relevance_score: relevanceScore,
              created_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString()
            };
          }

          return data;
        } catch (error) {
          console.error('Error processing video:', error);
          // Skip failed videos but continue processing others
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