import React, { useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, PlayCircle, ExternalLink } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { VideoTakeaways as VideoTakeawaysType } from '@/lib/gemini-takeaways';

interface VideoWithTakeaways extends Omit<VideoTakeawaysType, 'positive_takeaway' | 'negative_takeaway'> {
  positive_takeaway: string | null;
  negative_takeaway: string | null;
  neutral_takeaway?: string | null;
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
    
    // Handle null literal
    if (text === "null" || text.includes("null")) {
      return [];
    }
    
    // Replace literal \n with actual newlines, then split
    const cleanText = text.replace(/\\n/g, '\n');
    
    // Split by newlines and remove any empty lines or lines that only contain "null"
    return cleanText.split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Remove empty lines or lines with just "null"
        if (line.length === 0 || line === "null" || line.match(/^[✓⚠️]\s*null$/)) {
          return false;
        }
        
        // Remove incomplete sentences (ending with quotes or backslashes)
        if (line.match(/[\\"]$/) || line.match(/^[^.!?]*$/)) {
          return false;
        }
        
        // Remove lines that start with "The comment" or similar phrases
        if (line.match(/^(The comment|The video|This video) (warns|mentions|suggests|implies)/i)) {
          return false;
        }
        
        return true;
      });
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
  
  // Determine if a takeaway has valid content
  const hasTakeawayContent = (takeaway: string | null): boolean => {
    if (!takeaway) return false;
    if (takeaway === "null") return false;
    
    const processedTakeaway = preprocessTakeaway(takeaway);
    return processedTakeaway.length > 0;
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={`skeleton-${i}`} className="flex flex-col gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
            <Skeleton className="h-48 w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (!videos || videos.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-gray-600 text-center">No video insights available for {locationName || 'this location'}.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {videos.map((video) => {
        const hasPositiveTakeaways = hasTakeawayContent(video.positive_takeaway);
        const hasNegativeTakeaways = hasTakeawayContent(video.negative_takeaway);
        const hasTakeaways = hasPositiveTakeaways || hasNegativeTakeaways;
        const defaultTab = hasPositiveTakeaways ? "positive" : hasNegativeTakeaways ? "negative" : "positive";
        
        return (
          <div key={video.id || video.video_id} className="overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm">
            {/* Video player or thumbnail */}
            <div className="relative w-full aspect-video bg-gray-100">
              {activeVideoId === video.video_id ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1`}
                  title={video.title || ''}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0"
                ></iframe>
              ) : (
                <div 
                  className="relative w-full h-full cursor-pointer group"
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
                      e.currentTarget.src = `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 group-hover:bg-black/40 transition-opacity">
                    <PlayCircle className="h-16 w-16 text-white opacity-90" />
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">{video.title}</h3>
                  <p className="text-sm text-gray-600">{video.channel_name}</p>
                </div>
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
              
              {/* Video summary if available */}
              {video.summary && video.summary !== "null" && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                  {video.summary}
                </div>
              )}
              
              {/* Safety insights with tabs */}
              {hasTakeaways ? (
                <Tabs defaultValue={defaultTab} className="w-full">
                  <TabsList className="w-full grid grid-cols-2 mb-4">
                    <TabsTrigger 
                      value="positive" 
                      className="flex items-center gap-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-900"
                      disabled={!hasPositiveTakeaways}
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>What's Good</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="negative" 
                      className="flex items-center gap-2 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-900"
                      disabled={!hasNegativeTakeaways}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span>Watch Out For</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="positive" className="mt-0">
                    {hasPositiveTakeaways ? (
                      <div className="space-y-3 p-4 bg-emerald-50 rounded-lg">
                        {preprocessTakeaway(video.positive_takeaway).map((point, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <p className="text-emerald-800">{point.startsWith('✓') ? point.substring(1).trim() : point}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-center p-4">No positive safety insights found in this video.</p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="negative" className="mt-0">
                    {hasNegativeTakeaways ? (
                      <div className="space-y-3 p-4 bg-rose-50 rounded-lg">
                        {preprocessTakeaway(video.negative_takeaway).map((point, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
                            <p className="text-rose-800">{point.startsWith('⚠️') ? point.substring(2).trim() : point}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-center p-4">No safety concerns reported in this video.</p>
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600 text-center">
                  No safety insights available for this video.
                </div>
              )}
              
              {/* External link */}
              <div className="mt-6 flex justify-end">
                <a 
                  href={`https://www.youtube.com/watch?v=${video.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1.5 hover:underline"
                >
                  Watch on YouTube
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 