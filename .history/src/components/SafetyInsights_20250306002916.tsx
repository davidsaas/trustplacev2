import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, MessageCircle } from 'lucide-react';
import SafetyTakeaways from './SafetyTakeaways';

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
    <div className="space-y-6">
      {/* Safety Takeaways - Always visible */}
      <SafetyTakeaways takeaways={takeaways} isLoading={takeawaysLoading} />
      
      {/* Button to toggle community insights */}
      <div className="flex justify-center">
        <Button 
          variant="outline" 
          className=" gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="h-4 w-4" />
          {showComments ? "Hide Community Insights" : "See Community Insights"}
        </Button>
      </div>
      
      {/* Safety Insights - Only visible when showComments is true */}
      {showComments && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">


          </div>
          
          <div className="space-y-4">
            {visibleInsights.map((insight) => (
              <div key={insight.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                      {/* Generate avatar based on username */}
                      <img 
                        src={`https://i.pravatar.cc/150?u=${insight.username}`} 
                        alt={insight.username}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{insight.username}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(insight.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={getSentimentColor(insight.sentiment)}>
                    {insight.sentiment.charAt(0).toUpperCase() + insight.sentiment.slice(1)}
                  </Badge>
                </div>
                <p className="text-gray-700">{insight.body}</p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {insight.district ? `${insight.district}, ${insight.city}` : insight.city}
                  </span>
                  <a 
                    href={insight.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    View on Reddit
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
          
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button 
                variant="outline" 
                onClick={handleShowMore}
                className="flex items-center gap-2"
              >
                <ChevronDown className="h-4 w-4" />
                Show More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 