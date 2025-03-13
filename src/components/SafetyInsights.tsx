import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, MessageCircle, CheckCircle, AlertTriangle, LinkIcon } from 'lucide-react';
import SafetyTakeaways from './SafetyTakeaways';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SafetyInsight {
  id: string;
  comment_id: string;
  title: string;
  body: string;
  url: string;
  username: string;
  safety_score: number;
  sentiment: string;
  location_mentioned: string;
  district: string | null;
  city: string;
  created_at: string;
}

interface SafetyTakeaway {
  id?: string;
  latitude: number;
  longitude: number;
  radius: number;
  positive_takeaway: string | null;
  negative_takeaway: string | null;
  neutral_takeaway: string | null;
  created_at?: string;
  expires_at?: string;
}

interface SafetyInsightsProps {
  latitude: number;
  longitude: number;
  radius?: number;
}

export default function SafetyInsights({ latitude, longitude, radius = 2 }: SafetyInsightsProps) {
  const [insights, setInsights] = useState<SafetyInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const [takeaways, setTakeaways] = useState<SafetyTakeaway | null>(null);
  const [takeawaysLoading, setTakeawaysLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!latitude || !longitude) return;
      
      setLoading(true);
      setError(null);
      setTakeawaysLoading(true);
      
      try {
        // Fetch insights
        const insightsResponse = await fetch(
          `/api/safety-insights/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
        );
        
        if (!insightsResponse.ok) {
          throw new Error('Failed to fetch safety insights');
        }
        
        const insightsData = await insightsResponse.json();
        
        // Filter out irrelevant comments (questions or non-safety claims)
        const filteredInsights = insightsData.insights.filter((insight: SafetyInsight) => {
          const text = insight.body.toLowerCase();
          
          // Filter out questions
          if (text.includes('?') && (
            text.startsWith('how') || 
            text.startsWith('what') || 
            text.startsWith('where') || 
            text.startsWith('when') || 
            text.startsWith('why') || 
            text.startsWith('is it') || 
            text.startsWith('are there') ||
            text.startsWith('has any')
          )) {
            return false;
          }
          
          // Filter out irrelevant comments
          const irrelevantPhrases = [
            'legal to be a woman',
            'may be in a position to afford',
            'plan to move',
            'buying a condo',
            'buying a house',
            'buying an apartment',
            'looking to buy',
            'looking to move',
            'thinking of moving',
            'thinking about moving',
            'planning to move',
            'planning on moving'
          ];
          
          if (irrelevantPhrases.some(phrase => text.includes(phrase))) {
            return false;
          }
          
          // Must contain safety-related terms
          const safetyTerms = [
            'safe', 'unsafe', 'safety', 'dangerous', 'danger', 'crime', 
            'robbery', 'assault', 'theft', 'break-in', 'break in', 
            'mugging', 'shooting', 'violence', 'violent', 'sketchy', 
            'shady', 'scary', 'afraid', 'fear', 'police', 'cops'
          ];
          
          return safetyTerms.some(term => text.includes(term));
        });
        
        setInsights(filteredInsights);
        
        // Fetch takeaways
        const takeawaysResponse = await fetch(
          `/api/safety-insights/takeaways?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
        );
        
        if (takeawaysResponse.ok) {
          const takeawaysData = await takeawaysResponse.json();
          if (takeawaysData.success && takeawaysData.takeaways) {
            setTakeaways(takeawaysData.takeaways);
          }
        }
      } catch (err) {
        console.error('Error fetching safety data:', err);
        setError('Failed to load safety insights');
      } finally {
        setLoading(false);
        setTakeawaysLoading(false);
      }
    };
    
    fetchData();
  }, [latitude, longitude, radius]);
  
  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Helper function to get sentiment color
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'negative':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'mixed':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };
  
  const handleShowMore = () => {
    setVisibleCount(prev => prev + 5);
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
  
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-20 w-full rounded" />
        <Skeleton className="h-20 w-full rounded" />
        <Skeleton className="h-20 w-full rounded" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
        <p className="text-rose-700">{error}</p>
      </div>
    );
  }
  
  if (insights.length === 0 && !takeaways) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-500 text-center">No safety insights available for this location.</p>
      </div>
    );
  }
  
  const visibleInsights = insights.slice(0, visibleCount);
  const hasMore = visibleCount < insights.length;
  
  return (
    <div className="space-y-6">
      {/* Safety Takeaways */}
      {takeaways && (
        <div className="space-y-4">
          {/* Summary section */}
          {takeaways.neutral_takeaway && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-gray-700">{takeaways.neutral_takeaway}</p>
            </div>
          )}

          {/* Tabbed interface */}
          <div className="rounded-lg bg-gray-50 p-0.5">
            <Tabs defaultValue="positive" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger 
                  value="positive" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>What's Good</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="negative" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Watch Out For</span>
                </TabsTrigger>
              </TabsList>

              {/* Positive tab content */}
              <TabsContent value="positive" className="mt-6 space-y-3">
                {takeaways.positive_takeaway ? (
                  <div className="space-y-3">
                    {preprocessTakeaway(takeaways.positive_takeaway).map((point, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <p className="text-emerald-700">{point.startsWith('✓') ? point.substring(1).trim() : point}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No positive safety insights found.</p>
                )}
              </TabsContent>

              {/* Negative tab content */}
              <TabsContent value="negative" className="mt-6 space-y-3">
                {takeaways.negative_takeaway ? (
                  <div className="space-y-3">
                    {preprocessTakeaway(takeaways.negative_takeaway).map((point, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-rose-50 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
                        <p className="text-rose-700">{point.startsWith('⚠️') ? point.substring(2).trim() : point}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No safety concerns reported.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* Community Insights */}
      {showComments && insights.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            Community Safety Insights
          </h3>
          <div className="space-y-4">
            {visibleInsights.map((insight) => (
              <div key={insight.id} className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-slate-200 text-slate-800">
                          {insight.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{insight.username}</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(insight.created_at)}</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSentimentColor(insight.sentiment)}`}>
                      {insight.sentiment === 'positive' ? 'Safe' : 
                       insight.sentiment === 'negative' ? 'Concern' : 'Neutral'}
                    </span>
                    {insight.location_mentioned !== 'unspecified' && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {insight.location_mentioned}
                      </span>
                    )}
                  </div>

                  <p className="text-gray-700 text-sm">{insight.body}</p>
                </div>
              </div>
            ))}

            {hasMore && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleShowMore}
              >
                <ChevronDown className="h-4 w-4 mr-2" />
                Show More Insights
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 