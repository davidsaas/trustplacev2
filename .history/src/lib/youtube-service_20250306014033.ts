import { supabase } from './supabase';
import type { Database } from './supabase-types';
import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';

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
        // Ensure we have the best quality thumbnails
        return detailsResponse.data.items.map((item: any) => {
          // Get the highest quality thumbnail available
          const thumbnails = item.snippet.thumbnails;
          const thumbnailUrl = 
            (thumbnails.maxres && thumbnails.maxres.url) || 
            (thumbnails.high && thumbnails.high.url) || 
            (thumbnails.medium && thumbnails.medium.url) || 
            (thumbnails.default && thumbnails.default.url) ||
            `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`; // Direct fallback
          
          // Add the best thumbnail URL to the item
          return {
            ...item,
            snippet: {
              ...item.snippet,
              thumbnails: {
                ...item.snippet.thumbnails,
                best: { url: thumbnailUrl }
              }
            }
          };
        });
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
    // Try to get the transcript using youtube-transcript package
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (transcriptItems && transcriptItems.length > 0) {
      // Combine all transcript segments into a single text
      const fullTranscript = transcriptItems
        .map(item => item.text)
        .join(' ');
      
      console.log(`Successfully retrieved transcript for video ${videoId}`);
      return fullTranscript;
    }
    
    // If we couldn't get a transcript, fall back to using the video description
    const API_KEY = process.env.YOUTUBE_API_KEY;
    
    if (!API_KEY) {
      console.error('YouTube API key is missing');
      return null;
    }
    
    const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;
    const videoDetailsResponse = await axios.get(videoDetailsUrl);
    
    if (videoDetailsResponse.data && videoDetailsResponse.data.items && videoDetailsResponse.data.items.length > 0) {
      const description = videoDetailsResponse.data.items[0].snippet.description;
      // If there's a substantial description, use it as a partial substitute for transcript
      if (description && description.length > 200) {
        console.log(`Using description as fallback for video ${videoId}`);
        return `[Video description (transcript unavailable)]: ${description}`;
      }
    }
    
    console.log(`No transcript or substantial description found for video ${videoId}`);
    return null;
  } catch (error) {
    console.error(`Error fetching transcript for video ${videoId}:`, error);
    
    // Try to get the description as a last resort
    try {
      const API_KEY = process.env.YOUTUBE_API_KEY;
      
      if (!API_KEY) {
        return null;
      }
      
      const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;
      const videoDetailsResponse = await axios.get(videoDetailsUrl);
      
      if (videoDetailsResponse.data && videoDetailsResponse.data.items && videoDetailsResponse.data.items.length > 0) {
        const description = videoDetailsResponse.data.items[0].snippet.description;
        if (description && description.length > 200) {
          return `[Video description (transcript unavailable)]: ${description}`;
        }
      }
    } catch (fallbackError) {
      console.error(`Error fetching fallback description for video ${videoId}:`, fallbackError);
    }
    
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
    
    console.log('Attempting to store video with data:', {
      locationId,
      videoId: video.id,
      title: video.title,
      channelName: video.channelTitle,
      thumbnailUrl: video.thumbnailUrl,
      summary,
      sentiment,
      relevanceScore,
      expiresAt: expiresAt.toISOString()
    });
    
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
      console.error('Supabase error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log('Successfully stored video:', data);
    return data;
  } catch (error) {
    console.error('Error storing video with summary:', error);
    return null;
  }
} 