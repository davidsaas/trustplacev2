import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, PlayCircle } from 'lucide-react';
import type { Database } from '@/lib/supabase-types';
import VideoTakeaways from './VideoTakeaways';
import { findOrGenerateVideoTakeaways, VideoTakeaways as VideoTakeawaysType } from '@/lib/gemini-takeaways';
import { supabase } from '@/lib/supabase';

interface VideoWithMetadata extends VideoTakeawaysType {
  thumbnail_url: string;
  relevance_score: number;
}

interface LocationVideosProps {
  locationId: string;
  locationName: string;
  isLoading?: boolean;
}

export default function LocationVideos({ locationId, locationName, isLoading = false }: LocationVideosProps) {
  const [videos, setVideos] = useState<VideoWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoTakeaways, setVideoTakeaways] = useState<VideoWithMetadata[]>([]);
  const [processingTakeaways, setProcessingTakeaways] = useState(false);
  
  useEffect(() => {
    const fetchVideos = async () => {
      if (!locationId || !locationName) return;
      
      try {
        setLoading(true);
        const response = await fetch(
          `/api/videos/search?locationId=${encodeURIComponent(locationId)}&location=${encodeURIComponent(locationName)}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch videos');
        }
        
        const data = await response.json();
        
        if (data.success && data.videos) {
          // Sort videos by relevance score (highest first)
          const sortedVideos = [...data.videos].sort((a, b) => b.relevance_score - a.relevance_score);
          setVideos(sortedVideos);
          
          // Get takeaways for videos
          await fetchVideoTakeaways(sortedVideos);
        } else {
          setError(data.error || 'No videos found');
        }
      } catch (err) {
        console.error('Error fetching location videos:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    const fetchVideoTakeaways = async (videos: VideoWithMetadata[]) => {
      setProcessingTakeaways(true);
      
      try {
        // Filter out duplicate videos
        const uniqueVideos = videos.filter((video, index, self) => 
          index === self.findIndex(v => v.video_id === video.video_id)
        );
        
        // Get video IDs from sorted videos
        const videoIds = uniqueVideos.map(video => video.video_id);
        
        // Fetch video takeaways from Supabase
        const { data: takeawaysData, error } = await supabase
          .from('video_takeaways')
          .select('*')
          .in('video_id', videoIds);
        
        if (error) {
          throw error;
        }
        
        // Merge takeaways with video metadata
        const videosWithTakeaways = uniqueVideos.map(video => {
          const takeaway = takeawaysData?.find(t => t.video_id === video.video_id);
          return {
            ...video,
            ...takeaway,
            // Make sure thumbnail_url and relevance_score are preserved
            thumbnail_url: video.thumbnail_url,
            relevance_score: video.relevance_score
          };
        });
        
        setVideoTakeaways(videosWithTakeaways);
      } catch (err) {
        console.error('Error processing video takeaways:', err);
      } finally {
        setProcessingTakeaways(false);
      }
    };
    
    fetchVideos();
  }, [locationId, locationName]);
  
  if (isLoading || loading) {
    return (
      <Card className="rounded-xl border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-blue-600" />
            Location Videos
          </CardTitle>
          <CardDescription>
            YouTube videos about this location
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={`skeleton-${i}`} className="flex flex-col gap-4">
                <Skeleton className="h-48 w-full rounded-md" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="rounded-xl border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-blue-600" />
            Location Videos
          </CardTitle>
          <CardDescription>
            YouTube videos about this location
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center p-6 text-center">
            <div className="flex flex-col items-center">
              <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="rounded-xl border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
        <CardTitle className="text-blue-900 flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-blue-600" />
          Location Videos
        </CardTitle>
        <CardDescription>
          YouTube videos about {locationName || 'this location'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {videos.length === 0 ? (
          <div className="flex items-center justify-center p-6 text-center">
            <p className="text-gray-600">No videos found for this location.</p>
          </div>
        ) : (
          <VideoTakeaways 
            videos={videoTakeaways} 
            isLoading={processingTakeaways}
            locationName={locationName}
          />
        )}
      </CardContent>
    </Card>
  );
} 