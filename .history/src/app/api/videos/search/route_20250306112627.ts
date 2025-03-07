import { NextResponse } from 'next/server';
import { searchYouTubeVideos, getYouTubeTranscript } from '@/lib/youtube-service';
import { summarizeVideoContent, calculateVideoRelevance } from '@/lib/gemini-service';
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
    
    // Process videos in parallel - summarize and calculate relevance
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
          
          // Summarize video content with transcript if available
          const { summary, sentiment } = await summarizeVideoContent(
            videoTitle,
            videoDescription,
            locationName,
            transcript
          );
          
          // Calculate relevance score
          const relevanceScore = await calculateVideoRelevance(
            videoTitle,
            videoDescription,
            locationName
          );

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