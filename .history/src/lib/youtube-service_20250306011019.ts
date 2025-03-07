import { supabase } from './supabase';
import type { Database } from './supabase-types';

type LocationVideo = Database['public']['Tables']['location_videos']['Row'];

// YouTube API key should be stored in environment variables
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  description: string;
}

/**
 * Search for YouTube videos related to a location
 */
export async function searchLocationVideos(
  locationName: string,
  maxResults: number = 5
): Promise<YouTubeVideo[]> {
  try {
    // Create a search query that includes location name and relevant terms
    const searchQuery = `${locationName} neighborhood tour safety travel guide`;
    
    const response = await fetch(
      `${YOUTUBE_API_URL}/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.high.url,
      publishedAt: item.snippet.publishedAt,
      description: item.snippet.description
    }));
  } catch (error) {
    console.error('Error searching YouTube videos:', error);
    return [];
  }
}

/**
 * Get cached videos for a location or fetch new ones
 */
export async function getLocationVideos(locationId: string): Promise<LocationVideo[]> {
  try {
    // Check if we have cached videos that haven't expired
    const { data: cachedVideos, error } = await supabase
      .from('location_videos')
      .select('*')
      .eq('location_id', locationId)
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;
    
    // If we have valid cached videos, return them
    if (cachedVideos && cachedVideos.length > 0) {
      return cachedVideos;
    }
    
    // Otherwise, we'll need to fetch new videos
    return [];
  } catch (error) {
    console.error('Error getting location videos:', error);
    return [];
  }
}

/**
 * Store a video with its summary in the database
 */
export async function storeVideoWithSummary(
  locationId: string,
  video: YouTubeVideo,
  summary: string,
  sentiment: 'positive' | 'neutral' | 'negative',
  relevanceScore: number
): Promise<LocationVideo | null> {
  try {
    // Set expiration date to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
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
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error storing video with summary:', error);
    return null;
  }
} 