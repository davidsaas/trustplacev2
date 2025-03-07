import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown } from 'lucide-react';

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

  useEffect(() => {
    const fetchInsights = async () => {
      if (!latitude || !longitude) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/safety-insights/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch safety insights');
        }
        
        const data = await response.json();
        
        // Filter out irrelevant comments (questions or non-safety claims)
        const filteredInsights = data.insights.filter((insight: SafetyInsight) => {
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
      } catch (err) {
        console.error('Error fetching safety insights:', err);
        setError('Failed to load safety insights');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInsights();
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
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <img 
            src="/reddit-logo.png" 
            alt="Reddit" 
            className="h-5 w-5"
            onError={(e) => {
              // Fallback if image doesn't exist
              (e.target as HTMLImageElement).src = "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png";
            }}
          />
          <span className="font-medium text-gray-900">Reddit Safety Insights</span>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className={getSentimentColor('positive')}>
            Positive
          </Badge>
          <Badge variant="outline" className={getSentimentColor('negative')}>
            Negative
          </Badge>
          <Badge variant="outline" className={getSentimentColor('mixed')}>
            Mixed
          </Badge>
        </div>
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
                    className="object-cover"
                  />
                  <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full overflow-hidden border-2 border-white bg-white flex items-center justify-center">
                    <img 
                      src="https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png" 
                      alt="Reddit"
                      className="h-3 w-3"
                    />
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{insight.username}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(insight.created_at)}
                  </p>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={getSentimentColor(insight.sentiment)}
              >
                {insight.sentiment.charAt(0).toUpperCase() + insight.sentiment.slice(1)}
              </Badge>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-800 mb-1">
                {insight.location_mentioned}
              </p>
              <p className="text-gray-700">{insight.body}</p>
            </div>
            
            {insight.url && (
              <div className="mt-3 text-right">
                <a 
                  href={insight.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center justify-end gap-1"
                >
                  <span>View on Reddit</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </div>
            )}
          </div>
        ))}
        
        {hasMore && (
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2 mt-4"
            onClick={handleShowMore}
          >
            <span>Show {Math.min(5, insights.length - visibleCount)} more</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
} 