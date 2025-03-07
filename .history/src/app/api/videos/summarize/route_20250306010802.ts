import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// OpenAI API key should be stored in environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('video_id');
  
  if (!videoId) {
    return NextResponse.json(
      { success: false, error: 'Video ID parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Check if we already have a summary for this video
    const { data: existingVideo, error } = await supabase
      .from('location_videos')
      .select('*')
      .eq('video_id', videoId)
      .single();
    
    if (!error && existingVideo && existingVideo.summary) {
      return NextResponse.json({
        success: true,
        data: existingVideo,
        source: 'cache'
      });
    }

    // Fetch video details from YouTube API
    const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;
    const videoResponse = await fetch(videoDetailsUrl);
    
    if (!videoResponse.ok) {
      throw new Error('Failed to fetch video details from YouTube API');
    }
    
    const videoData = await videoResponse.json();
    
    if (!videoData.items || videoData.items.length === 0) {
      throw new Error('Video not found');
    }
    
    const videoDetails = videoData.items[0].snippet;
    
    // Generate a summary using OpenAI
    const summary = await generateVideoSummary(
      videoDetails.title,
      videoDetails.description,
      videoId
    );
    
    // Update the video record with the summary
    if (existingVideo) {
      await supabase
        .from('location_videos')
        .update({ summary })
        .eq('video_id', videoId);
      
      existingVideo.summary = summary;
      
      return NextResponse.json({
        success: true,
        data: existingVideo
      });
    } else {
      // If the video doesn't exist in our database yet, return just the summary
      return NextResponse.json({
        success: true,
        data: {
          video_id: videoId,
          title: videoDetails.title,
          channel_name: videoDetails.channelTitle,
          thumbnail_url: videoDetails.thumbnails.high.url,
          summary
        }
      });
    }
  } catch (error) {
    console.error('Error summarizing video:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to summarize video',
      },
      { status: 500 }
    );
  }
}

async function generateVideoSummary(title: string, description: string, videoId: string): Promise<string> {
  try {
    // For a production app, you would want to use YouTube's captions/transcript API
    // or a service that can extract content from videos
    // For this example, we'll use the video title and description as context
    
    const prompt = `
      Please create a concise summary (100-150 words) of this YouTube video about a location.
      Focus on safety information, neighborhood characteristics, and traveler experiences.
      
      Video Title: ${title}
      Video Description: ${description}
      Video ID: ${videoId}
      
      Summary:
    `;
    
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes YouTube videos about travel locations. Focus on safety information, neighborhood characteristics, and traveler experiences.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Summary generation failed. Please try again later.';
  }
} 