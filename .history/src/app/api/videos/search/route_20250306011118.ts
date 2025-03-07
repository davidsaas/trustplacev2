import { NextResponse } from 'next/server';
import { searchLocationVideos } from '@/lib/youtube-service';
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
    } else if (cachedVideos && cachedVideos.length > 0) {
      // Return cached videos if available
      return NextResponse.json({
        success: true,
        videos: cachedVideos,
        source: 'cache'
      });
    }
    
    // If no cached videos, search YouTube
    const videos = await searchLocationVideos(locationName, maxResults);
    
    if (videos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No videos found for this location'
      });
    }
    
    // Process videos in parallel - summarize and calculate relevance
    const processedVideos = await Promise.all(
      videos.map(async (video) => {
        // Summarize video content
        const { summary, sentiment } = await summarizeVideoContent(
          video.title,
          video.description,
          locationName
        );
        
        // Calculate relevance score
        const relevanceScore = await calculateVideoRelevance(
          video.title,
          video.description,
          locationName
        );
        
        // Store in database for future use
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // Expire in 30 days
        
        const { data, error } = await supabase
          .from('location_videos')
          .upsert({
            location_id: locationId,
            video_id: video.id,
            title: video.title,
            channel_name: video.channelTitle,
            thumbnail_url: video.thumbnailUrl,
            summary,
            sentiment,
            relevance_score: relevanceScore,
            expires_at: expiresAt.toISOString()
          })
          .select()
          .single();
          
        if (error) {
          console.error('Error storing video:', error);
        }
        
        return {
          id: data?.id || '',
          location_id: locationId,
          video_id: video.id,
          title: video.title,
          channel_name: video.channelTitle,
          thumbnail_url: video.thumbnailUrl,
          summary,
          sentiment,
          relevance_score: relevanceScore,
          created_at: data?.created_at || new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      videos: processedVideos,
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