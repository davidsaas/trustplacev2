import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, ThumbsUp, ThumbsDown, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
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
  const [expandedSummaries, setExpandedSummaries] = useState<Record<string, boolean>>({});
  
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
  
  const toggleSummary = (videoId: string) => {
    setExpandedSummaries(prev => ({
      ...prev,
      [videoId]: !prev[videoId]
    }));
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
  
  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'negative':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
              <div key={`skeleton-${i}`} className="flex flex-col gap-4">
                <Skeleton className="h-48 w-full rounded-md" />
                <div className="space-y-2">
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
          <div className="space-y-8">
            {videos.map((video) => (
              <div key={video.id} className="overflow-hidden bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                {/* Video player or thumbnail */}
                <div className="relative w-full h-64 bg-gray-100">
                  {activeVideoId === video.video_id ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1`}
                      title={video.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0"
                    ></iframe>
                  ) : (
                    <div 
                      className="relative w-full h-full cursor-pointer group"
                      onClick={() => handlePlayVideo(video.video_id)}
                    >
                      <img 
                        src={`https://i.ytimg.com/vi/${video.video_id}/maxresdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // If maxresdefault fails, fall back to hqdefault
                          e.currentTarget.src = `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity">
                        <PlayCircle className="h-16 w-16 text-white opacity-90" />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Video info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{video.title}</h3>
                    {video.sentiment && (
                      <Badge 
                        variant="outline"
                        className={`ml-2 flex items-center gap-1 ${getSentimentColor(video.sentiment)}`}
                      >
                        {getSentimentIcon(video.sentiment)}
                        {video.sentiment.charAt(0).toUpperCase() + video.sentiment.slice(1)}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{video.channel_name}</p>
                  
                  {/* Summary section with expand/collapse */}
                  <div className="mt-3 bg-gray-50 rounded-md p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-700">Key Takeaways</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleSummary(video.id)}
                        className="h-8 w-8 p-0"
                      >
                        {expandedSummaries[video.id] ? 
                          <ChevronUp className="h-5 w-5" /> : 
                          <ChevronDown className="h-5 w-5" />
                        }
                      </Button>
                    </div>
                    <p className={`text-gray-700 text-sm ${expandedSummaries[video.id] ? '' : 'line-clamp-2'}`}>
                      {video.summary}
                    </p>
                  </div>
                  
                  {/* External link */}
                  <div className="mt-4 flex justify-end">
                    <a 
                      href={`https://www.youtube.com/watch?v=${video.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      Watch on YouTube
                      <ExternalLink 
                        key={`external-link-${video.id}`}
                        className="h-3 w-3" 
                      />
                    </a>
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