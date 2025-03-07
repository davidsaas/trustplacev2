import { NextResponse } from 'next/server';
import { searchYouTubeVideos, getYouTubeTranscript, storeVideoWithSummary } from '@/lib/youtube-service';
import { summarizeVideoContent, calculateVideoRelevance } from '@/lib/gemini-service';
import { supabase } from '@/lib/supabase';

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
    
    // Check if we have cached videos for this location
    const { data: cachedVideos, error } = await supabase
      .from('location_videos')
      .select('*')
      .eq('location_id', locationId)
      .gt('expires_at', new Date().toISOString())
      .order('relevance_score', { ascending: false });
      
    if (error) {
      console.error('Error fetching cached videos:', error);
      // Check if table doesn't exist (42P01 is PostgreSQL's error code for undefined_table)
      if (error.code === '42P01') {
        console.error('ERROR: Table location_videos does not exist. Please run the SQL schema migration first.');
        return NextResponse.json(
          { success: false, error: 'Database setup incomplete. Table location_videos not found.' },
          { status: 500 }
        );
      }
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
    
    console.log(`Found ${youtubeVideos.length} videos for ${locationName}`);
    
    // Process videos in parallel - summarize and calculate relevance
    const processedVideos = await Promise.all(
      youtubeVideos.map(async (video, index) => {
        try {
          // Extract video ID - handle different API response formats
          const videoId = typeof video.id === 'object' ? video.id.videoId : video.id;
          
          console.log(`Processing video ${index + 1}/${youtubeVideos.length}: ${videoId}`);
          
          const videoTitle = video.snippet.title;
          const videoDescription = video.snippet.description;
          const channelTitle = video.snippet.channelTitle;
          
          // Get the best thumbnail URL
          const thumbnailUrl = video.snippet.thumbnails.best?.url || 
                            video.snippet.thumbnails.high?.url || 
                            video.snippet.thumbnails.medium?.url || 
                            video.snippet.thumbnails.default?.url || 
                            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          
          // Format as YouTubeVideo for our storage function
          const formattedVideo = {
            id: videoId,
            title: videoTitle,
            channelTitle: channelTitle,
            thumbnailUrl: thumbnailUrl,
            publishedAt: video.snippet.publishedAt || new Date().toISOString(),
            description: videoDescription
          };
          
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
          
          // Store the video using our helper function
          console.log(`Attempting to store video: ${videoId}`);
          const storedVideo = await storeVideoWithSummary(
            locationId,
            formattedVideo,
            summary,
            sentiment,
            relevanceScore
          );
          
          if (!storedVideo) {
            console.log(`Failed to store video ${videoId} in Supabase, falling back to API response`);
          } else {
            console.log(`Successfully stored video ${videoId} in Supabase`);
          }
          
          // Return either the stored video data or construct our own response
          return storedVideo || {
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
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
          };
        } catch (error) {
          console.error(`Error processing video ${index + 1}:`, error);
          return null;
        }
      })
    );
    
    return NextResponse.json({
      success: true,
      videos: processedVideos,
      source: 'youtube'
    });
  } catch (error) {
    console.error('Error in video search API:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { success: false, error: 'Failed to search videos' },
      { status: 500 }
    );
  }
} 