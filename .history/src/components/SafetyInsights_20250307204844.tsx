import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, MessageCircle, CheckCircle, AlertTriangle, LinkIcon } from 'lucide-react';
import SafetyTakeaways from './SafetyTakeaways';
import SafetyMetrics from './SafetyMetrics';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DistrictSafetyMetrics } from '@/lib/safety-insights/safety-metrics';

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
  const [metrics, setMetrics] = useState<DistrictSafetyMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<string>("metrics");

  useEffect(() => {
    const fetchData = async () => {
      if (!latitude || !longitude) return;
      
      setLoading(true);
      setError(null);
      setTakeawaysLoading(true);
      
      try {
        console.log('Enabling safety insights with coordinates:', { lat: latitude, lng: longitude });
        
        // Fetch insights and metrics from the combined endpoint
        const response = await fetch(
          `/api/safety-insights/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch safety insights');
        }
        
        const data = await response.json();
        
        // Handle insights
        const insightsList = data.insights || [];
        
        // Filter out irrelevant comments (questions or non-safety claims)
        const filteredInsights = insightsList.filter((insight: SafetyInsight) => {
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
        
        // Handle metrics
        if (data.metrics) {
          setMetrics(data.metrics);
          // If we have metrics, default to that tab
          setActiveTab("metrics");
        }
        
        // Handle takeaways
        if (data.takeaways) {
          setTakeaways(data.takeaways);
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
  
  const hasNoData = !metrics && insights.length === 0 && !takeaways;
  
  if (hasNoData) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-500 text-center">No safety information available for this location.</p>
      </div>
    );
  }
  
  const visibleInsights = insights.slice(0, visibleCount);
  const hasMore = visibleCount < insights.length;
  
  return (
    <div className="space-y-5">
      {/* Safety Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-slate-100 mb-4">
          <TabsTrigger 
            value="metrics" 
            className="flex items-center gap-2"
            disabled={!metrics}
          >
            <CheckCircle className="h-4 w-4" />
            <span>Safety Metrics</span>
          </TabsTrigger>
          <TabsTrigger 
            value="insights" 
            className="flex items-center gap-2"
            disabled={insights.length === 0}
          >
            <MessageCircle className="h-4 w-4" />
            <span>Community Insights</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Safety Metrics Tab */}
        <TabsContent value="metrics" className="mt-0">
          {metrics ? (
            <SafetyMetrics districtMetrics={metrics} isLoading={false} />
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-500 text-center">No safety metrics available for this location.</p>
            </div>
          )}
        </TabsContent>
        
        {/* Community Insights Tab */}
        <TabsContent value="insights" className="mt-0">
          {/* Safety Takeaways */}
          {takeaways && (
            <SafetyTakeaways takeaways={takeaways} isLoading={takeawaysLoading} />
          )}
          
          {/* Community insights */}
          {insights.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Safety mentions from locals</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="text-sm flex items-center gap-1"
                >
                  {showComments ? "Show Less" : "Show All"}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showComments ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              
              {/* Render either all insights or just the visible ones */}
              {(showComments ? insights : visibleInsights).map((insight) => (
                <Card key={insight.id} className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-slate-100">{insight.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-600">{insight.username}</span>
                      </div>
                      <Badge variant="outline" className={getSentimentColor(insight.sentiment)}>
                        {insight.sentiment}
                      </Badge>
                    </div>
                    <p className="text-gray-800 mb-2">{insight.body}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{formatDate(insight.created_at)}</span>
                      <a 
                        href={insight.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <LinkIcon className="h-3 w-3" />
                        Source
                      </a>
                    </div>
                  </div>
                </Card>
              ))}
              
              {!showComments && hasMore && (
                <div className="text-center">
                  <Button 
                    variant="outline" 
                    onClick={handleShowMore}
                    className="text-sm"
                  >
                    Show more safety insights
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-500 text-center">No community insights available for this location.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 