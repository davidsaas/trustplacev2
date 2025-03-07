import { supabase } from './supabase';
import type { Database } from './supabase-types';
import axios from 'axios';

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
export async function searchYouTubeVideos(location: string, maxResults = 10): Promise<any[]> {
  try {
    const API_KEY = process.env.YOUTUBE_API_KEY;
    
    if (!API_KEY) {
      console.error('YouTube API key is missing');
      return [];
    }
    
    const searchQuery = `${location} neighborhood safety travel`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&maxResults=${maxResults}&type=video&key=${API_KEY}`;
    
    const response = await axios.get(url);
    
    if (response.data && response.data.items) {
      // Fetch additional video details to get view counts and ratings
      const videoIds = response.data.items.map((item: any) => item.id.videoId).join(',');
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${API_KEY}`;
      const detailsResponse = await axios.get(detailsUrl);
      
      if (detailsResponse.data && detailsResponse.data.items) {
        return detailsResponse.data.items;
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error searching YouTube videos:', error);
    return [];
  }
}

/**
 * Fetch transcript for a YouTube video
 * @param videoId The YouTube video ID
 * @returns The video transcript as a string or null if not available
 */
export async function getYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    const API_KEY = process.env.YOUTUBE_API_KEY;
    
    if (!API_KEY) {
      console.error('YouTube API key is missing');
      return null;
    }
    
    // First, get the captions track
    const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${API_KEY}`;
    const captionsResponse = await axios.get(captionsUrl);
    
    if (!captionsResponse.data || !captionsResponse.data.items || captionsResponse.data.items.length === 0) {
      console.log(`No captions found for video ${videoId}`);
      return null;
    }
    
    // Find the English caption track, prefer auto-generated if available
    let captionId = null;
    const items = captionsResponse.data.items;
    
    // First try to find an English track
    for (const item of items) {
      if (item.snippet.language === 'en' && !item.snippet.trackKind.includes('ASR')) {
        captionId = item.id;
        break;
      }
    }
    
    // If no English track, try auto-generated
    if (!captionId) {
      for (const item of items) {
        if (item.snippet.trackKind.includes('ASR')) {
          captionId = item.id;
          break;
        }
      }
    }
    
    // If still no caption track, use the first one
    if (!captionId && items.length > 0) {
      captionId = items[0].id;
    }
    
    if (!captionId) {
      console.log(`No suitable caption track found for video ${videoId}`);
      return null;
    }
    
    // Now fetch the actual transcript
    const transcriptUrl = `https://www.googleapis.com/youtube/v3/captions/${captionId}?key=${API_KEY}`;
    
    // Note: Getting the actual transcript requires OAuth authentication for the YouTube Data API
    // which is beyond the scope of this implementation.
    // As a fallback, we'll use an alternative method: fetch video description for additional context
    
    const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;
    const videoDetailsResponse = await axios.get(videoDetailsUrl);
    
    if (videoDetailsResponse.data && videoDetailsResponse.data.items && videoDetailsResponse.data.items.length > 0) {
      const description = videoDetailsResponse.data.items[0].snippet.description;
      // If there's a substantial description, use it as a partial substitute for transcript
      if (description && description.length > 200) {
        return `[Video description (transcript unavailable)]: ${description}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching transcript for video ${videoId}:`, error);
    return null;
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