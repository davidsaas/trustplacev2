import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, MessageCircle, CheckCircle, AlertTriangle, LinkIcon } from 'lucide-react';
import SafetyTakeaways from './SafetyTakeaways';
import { Card, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  
  if (loading) {
    return (
      <div className="space-y-4">
        <SafetyTakeaways takeaways={null} isLoading={true} />
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
  
  if (insights.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-500 text-center">No safety insights available for this location.</p>
      </div>
    );
  }
  
  const visibleInsights = insights.slice(0, visibleCount);
  const hasMore = visibleCount < insights.length;
  
  return (
    <div className="space-y-5">
      {/* Safety Takeaways */}
      {takeaways && (
        <Card className="overflow-hidden">
          {/* Summary section */}
          {takeaways.neutral_takeaway && (
            <div className="p-4 bg-slate-50 border-b">
              <p className="text-gray-700">{takeaways.neutral_takeaway}</p>
            </div>
          )}

          {/* Tabbed interface */}
          <Tabs defaultValue="positive" className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-slate-100">
              <TabsTrigger value="positive" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>What's Good</span>
              </TabsTrigger>
              <TabsTrigger value="negative" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Watch Out For</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Positive tab content */}
            <TabsContent value="positive" className="p-4 space-y-3">
              {takeaways.positive_takeaway ? (
                <div className="space-y-3">
                  {takeaways.positive_takeaway.split('. ').filter(Boolean).map((point, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <p className="text-emerald-700">{point}.</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No positive safety insights found.</p>
              )}
            </TabsContent>
            
            {/* Negative tab content */}
            <TabsContent value="negative" className="p-4 space-y-3">
              {takeaways.negative_takeaway ? (
                <div className="space-y-3">
                  {takeaways.negative_takeaway.split('. ').filter(Boolean).map((point, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
                      <p className="text-rose-700">{point}.</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No safety concerns reported.</p>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {/* Community Insights */}
      {showComments && insights.length > 0 && (
        <div className="mt-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Community Safety Insights</h4>
          <div className="space-y-4">
            {insights.slice(0, visibleCount).map((insight) => (
              <Card key={insight.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="space-y-2">
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
                  
                  {insight.url && (
                    <a 
                      href={insight.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <LinkIcon className="h-3 w-3" />
                      <span>Source</span>
                    </a>
                  )}
                </div>
              </Card>
            ))}
            
            {/* Show More Button */}
            {insights.length > visibleCount && (
              <div className="flex justify-center mt-6">
                <Button 
                  variant="outline" 
                  className="text-blue-600 hover:text-blue-800"
                  onClick={handleShowMore}
                >
                  Show {Math.min(5, insights.length - visibleCount)} More Insights
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Button to toggle comments */}
      <div className="flex justify-center mt-4">
        <Button 
          variant="outline" 
          className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="h-4 w-4" />
          {showComments ? "Hide Community Insights" : "See Community Insights"}
        </Button>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 rounded-lg">
          <p>{error}</p>
        </div>
      )}
      
      {/* Empty State */}
      {!loading && !error && insights.length === 0 && !takeaways && (
        <div className="text-center py-8">
          <p className="text-gray-500">No safety insights available for this location.</p>
        </div>
      )}
    </div>
  );
} 