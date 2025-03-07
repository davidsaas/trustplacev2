import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';
import type { Database } from '@/lib/supabase-types';

type LocationVideo = Database['public']['Tables']['location_videos']['Row'];

interface LocationVideosProps {
  locationId: string;
  locationName: string;
  isLoading?: boolean;
}

export default function LocationVideos({ locationId, locationName, isLoading = false }: LocationVideosProps) {
  const [videos, setVideos] = useState<LocationVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  
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
    
    fetchVideos();
  }, [locationId, locationName]);
  
  const handlePlayVideo = (videoId: string) => {
    setActiveVideoId(videoId === activeVideoId ? null : videoId);
  };
  
  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };
  
  if (isLoading || loading) {
    return (
      <Card className="rounded-xl border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r">
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-blue-600" />
            Location Videos
          </CardTitle>
          <CardDescription>
            YouTube videos about this location
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col md:flex-row gap-4">
                <Skeleton className="h-32 w-full md:w-64 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-16 w-full" />
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
        <CardHeader className="bg-gradient-to-r">
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
      <CardHeader className="bg-gradient-to-r">
        <CardTitle className="text-blue-900 flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-blue-600" />
          Location Videos
        </CardTitle>
        <CardDescription>
          YouTube videos about this location
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {videos.length === 0 ? (
          <div className="flex items-center justify-center p-6 text-center">
            <p className="text-gray-600">No videos found for this location.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {videos.map((video) => (
              <div key={video.id} className="border border-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row">
                  {/* Video thumbnail or player */}
                  <div className="relative md:w-64 h-48">
                    {activeVideoId === video.video_id ? (
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1`}
                        title={video.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <div 
                        className="relative w-full h-full cursor-pointer"
                        onClick={() => handlePlayVideo(video.video_id)}
                      >
                        <img 
                          src={video.thumbnail_url} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-20 transition-opacity">
                          <PlayCircle className="h-12 w-12 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Video info */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{video.title}</h3>
                      {video.sentiment && (
                        <Badge 
                          variant={
                            video.sentiment === 'positive' ? 'secondary' : 
                            video.sentiment === 'negative' ? 'destructive' : 
                            'outline'
                          }
                          className={`ml-2 flex items-center gap-1 ${
                            video.sentiment === 'positive' ? 'bg-green-100 text-green-800' : 
                            video.sentiment === 'negative' ? '' : 
                            ''
                          }`}
                        >
                          {getSentimentIcon(video.sentiment)}
                          {video.sentiment.charAt(0).toUpperCase() + video.sentiment.slice(1)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{video.channel_name}</p>
                    <div className="mt-3">
                      <p className="text-gray-700">{video.summary}</p>
                    </div>
                    <div className="mt-3">
                      <a 
                        href={`https://www.youtube.com/watch?v=${video.video_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Watch on YouTube
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 