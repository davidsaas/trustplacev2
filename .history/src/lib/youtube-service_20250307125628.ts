import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase-types';
import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { findOrGenerateVideoTakeaways } from '@/lib/gemini-takeaways';

type LocationVideo = Database['public']['Tables']['location_videos']['Row'];

// YouTube API key should be stored in environment variables
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
}

/**
 * Search for YouTube videos related to a location
 */
export async function searchYouTubeVideos(
  location: string,
  maxResults: number = 5
): Promise<YouTubeVideo[]> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&q=${encodeURIComponent(`${location} safety travel guide`)}&` +
      `maxResults=${maxResults}&type=video&relevanceLanguage=en&` +
      `key=${process.env.YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('YouTube API request failed');
    }

    const data = await response.json();
    
    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || 
                item.snippet.thumbnails.medium?.url || 
                item.snippet.thumbnails.default?.url ||
                `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
      channelTitle: item.snippet.channelTitle
    }));
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
    const response = await fetch(
      `/api/videos/transcript?videoId=${encodeURIComponent(videoId)}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch transcript');
    }
    
    const data = await response.json();
    return data.transcript || null;
  } catch (error) {
    console.error('Error fetching transcript:', error);
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
      .gt('expires_at', new Date().toISOString())
      .order('relevance_score', { ascending: false });

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
    // Create server-side Supabase client
    const supabase = createServerComponentClient({ cookies });
    
    // Set expiration date to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    console.log('Storing video in Supabase:', {
      locationId,
      videoId: video.id,
      title: video.title,
      sentiment,
      relevanceScore
    });
    
    const { data, error } = await supabase
      .from('location_videos')
      .upsert({
        location_id: locationId,
        video_id: video.id,
        title: video.title,
        channel_name: video.channelTitle,
        thumbnail_url: video.thumbnail,
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
      console.error('Supabase error storing video:', error);
      throw error;
    }
    
    console.log('Successfully stored video in Supabase:', data);
    return data;
  } catch (error) {
    console.error('Error storing video with summary:', error);
    return null;
  }
}

/**
 * Gets safety takeaways for a YouTube video by extracting safety information from the video content
 * @param video The YouTube video object
 * @param transcript The video transcript
 * @returns Object containing positive and negative takeaways and a summary
 */
export async function getVideoSafetyTakeaways(
  video: YouTubeVideo,
  transcript: string | null
) {
  try {
    const takeaways = await findOrGenerateVideoTakeaways(video.id, '', {
      title: video.title,
      description: video.description,
      transcript: transcript || undefined,
      channel_name: video.channelTitle
    });
    
    // If positive_takeaway is null, ensure we're not trying to display empty content
    if (!takeaways.positive_takeaway || takeaways.positive_takeaway.trim() === '') {
      takeaways.positive_takeaway = null;
    }
    
    // If negative_takeaway is null, ensure we're not trying to display empty content
    if (!takeaways.negative_takeaway || takeaways.negative_takeaway.trim() === '') {
      takeaways.negative_takeaway = null;
    }
    
    // Ensure summary mentions safety specifically
    if (takeaways.summary) {
      takeaways.summary = takeaways.summary.replace(
        'Safety information extracted from',
        'Safety-specific information extracted from'
      );
    }
    
    return takeaways;
  } catch (error) {
    console.error('Error generating video takeaways:', error);
    return {
      positive_takeaway: null,
      negative_takeaway: null,
      summary: null
    };
  }
} 