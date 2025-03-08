import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, MessageCircle, CheckCircle, AlertTriangle, LinkIcon } from 'lucide-react';
import SafetyTakeaways from './SafetyTakeaways';
import SafetyMetrics from './SafetyMetrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  useEffect(() => {
    const fetchData = async () => {
      if (!latitude || !longitude) return;
      
      setLoading(true);
      setError(null);
      setTakeawaysLoading(true);
      
      try {
        console.log('Enabling safety insights with coordinates:', { lat: latitude, lng: longitude });
        
        // Fetch combined safety data from the API
        const response = await fetch(
          `/api/safety-insights/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch safety insights');
        }
        
        const data = await response.json();
        console.log('Safety data response:', data);
        
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
          console.log('Safety metrics found:', data.metrics);
          setMetrics(data.metrics);
        } else {
          console.log('No safety metrics found in response');
          setMetrics(null);
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
        <div className="space-y-4">
          <Skeleton className="h-[300px] w-full rounded-lg" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
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
      {/* Safety Takeaways Component */}
      {takeaways && (
        <SafetyTakeaways 
          takeaways={takeaways} 
          isLoading={takeawaysLoading} 
        />
      )}
      
      {/* Safety Metrics Card */}
      <SafetyMetrics 
        districtMetrics={metrics} 
        isLoading={loading} 
      />
      
      {/* Local Insights Card */}
      {insights.length > 0 && (
        <Card className="w-full">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Local Community Insights
                </CardTitle>
                <CardDescription>
                  Safety-related comments from local residents
                </CardDescription>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="px-2 py-1 h-7"
                onClick={() => setShowComments(!showComments)}
              >
                {showComments ? 'Hide' : 'Show'} comments
                <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${showComments ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          
          {showComments && (
            <CardContent>
              <div className="space-y-4">
                {visibleInsights.map((insight) => (
                  <div key={insight.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">
                            {insight.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{insight.username}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getSentimentColor(insight.sentiment)}`}
                        >
                          {insight.sentiment}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(insight.created_at)}
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <p>{insight.body}</p>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <div>
                        {insight.district && (
                          <span className="mr-2">
                            District: {insight.district}
                          </span>
                        )}
                        <span>
                          Safety Score: {insight.safety_score.toFixed(1)}
                        </span>
                      </div>
                      
                      <a 
                        href={insight.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center hover:text-blue-500"
                      >
                        <LinkIcon className="h-3 w-3 mr-1" />
                        Source
                      </a>
                    </div>
                  </div>
                ))}
                
                {hasMore && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleShowMore}
                  >
                    Show more insights
                  </Button>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
} 