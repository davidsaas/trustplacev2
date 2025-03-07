import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, PlayCircle, ExternalLink, Info } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { VideoTakeaways as VideoTakeawaysType } from '@/lib/gemini-takeaways';

interface VideoWithTakeaways extends Omit<VideoTakeawaysType, 'positive_takeaway' | 'negative_takeaway'> {
  positive_takeaway: string | null;
  negative_takeaway: string | null;
  thumbnail_url: string;
  sentiment?: string | null;
  relevance_score?: number;
}

export interface VideoTakeawaysProps {
  videos: VideoWithTakeaways[];
  isLoading?: boolean;
  locationName?: string;
}

export default function VideoTakeaways({ videos, isLoading = false, locationName }: VideoTakeawaysProps) {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  
  const handlePlayVideo = (videoId: string) => {
    setActiveVideoId(videoId === activeVideoId ? null : videoId);
  };
  
  // Helper function to properly format takeaway content
  const preprocessTakeaway = (text: string | null): string[] => {
    if (!text) return [];
    
    // Replace literal \n with actual newlines, then split
    const cleanText = text.replace(/\\n/g, '\n');
    
    // Split by newlines and remove any empty lines
    return cleanText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };
  
  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
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
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={`skeleton-${i}`} className="overflow-hidden">
            <Skeleton className="h-48 w-full aspect-video" />
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (!videos || videos.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-gray-500 text-center">No video insights available for {locationName || 'this location'}.</p>
      </Card>
    );
  }
  
  // Group videos by 2 for desktop layout
  const videoRows = [];
  for (let i = 0; i < videos.length; i += 2) {
    videoRows.push(videos.slice(i, i + 2));
  }
  
  return (
    <div className="space-y-8">
      {videos.map((video) => (
        <Card key={video.id || video.video_id} className="overflow-hidden">
          <div className="md:flex">
            {/* Video player or thumbnail */}
            <div className="md:w-2/5 relative">
              <div className="aspect-video bg-gray-100">
                {activeVideoId === video.video_id ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1`}
                    title={video.title || ''}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full"
                  ></iframe>
                ) : (
                  <div 
                    className="relative h-full cursor-pointer group"
                    onClick={() => handlePlayVideo(video.video_id)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePlayVideo(video.video_id)}
                    tabIndex={0}
                    aria-label={`Play video: ${video.title || 'YouTube video'}`}
                  >
                    <img 
                      src={video.thumbnail_url || `https://i.ytimg.com/vi/${video.video_id}/maxresdefault.jpg`}
                      alt={video.title || ''}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // If maxresdefault fails, fall back to hqdefault
                        e.currentTarget.src = `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 group-hover:bg-black/40 transition-opacity">
                      <PlayCircle className="h-16 w-16 text-white opacity-90" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Video info and takeaways */}
            <div className="md:w-3/5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
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
                
                <p className="text-sm text-gray-600 mb-4">{video.channel_name}</p>
                
                {/* Takeaways display */}
                <div className="space-y-4">
                  {/* Positive takeaways */}
                  {video.positive_takeaway && (
                    <div className="bg-emerald-50 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                        <h4 className="font-medium text-emerald-800">What's Good</h4>
                      </div>
                      <div className="space-y-2">
                        {preprocessTakeaway(video.positive_takeaway).map((point, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <span className="text-emerald-700 mt-0.5 flex-shrink-0">•</span>
                            <p className="text-emerald-700 text-sm">{point.startsWith('✓') ? point.substring(1).trim() : point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Negative takeaways */}
                  {video.negative_takeaway && (
                    <div className="bg-rose-50 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-rose-600" />
                        <h4 className="font-medium text-rose-800">Watch Out For</h4>
                      </div>
                      <div className="space-y-2">
                        {preprocessTakeaway(video.negative_takeaway).map((point, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <span className="text-rose-700 mt-0.5 flex-shrink-0">•</span>
                            <p className="text-rose-700 text-sm">{point.startsWith('⚠️') ? point.substring(2).trim() : point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* No takeaways message */}
                  {!video.positive_takeaway && !video.negative_takeaway && (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-gray-500" />
                        <p className="text-gray-600 text-sm">No specific safety insights were found in this video.</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* External link */}
                <div className="mt-4 flex justify-end">
                  <a 
                    href={`https://www.youtube.com/watch?v=${video.video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    tabIndex={0}
                    aria-label="Watch on YouTube"
                  >
                    Watch on YouTube
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
} 