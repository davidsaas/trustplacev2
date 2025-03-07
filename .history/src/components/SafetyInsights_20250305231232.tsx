import React, { useState, useEffect } from 'react';

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
        setInsights(data.insights || []);
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
  const getSentimentColor = (sentiment: string, score: number) => {
    if (sentiment === 'positive') return 'text-green-600';
    if (sentiment === 'negative') return score > 0.7 ? 'text-red-600' : 'text-orange-500';
    return 'text-gray-600';
  };
  
  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Local Safety Insights</h3>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Local Safety Insights</h3>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }
  
  if (insights.length === 0) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Local Safety Insights</h3>
        <p className="text-gray-500">No safety insights available for this location.</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Local Safety Insights</h3>
      <p className="text-sm text-gray-500 mb-4">
        Based on {insights.length} local discussions about safety
      </p>
      
      <div className="space-y-4">
        {insights.map((insight) => (
          <div key={insight.id} className="border-b pb-4 last:border-b-0">
            <div className="flex justify-between items-start">
              <h4 className="font-medium">{insight.location_mentioned}</h4>
              <span 
                className={`text-sm font-medium ${getSentimentColor(insight.sentiment, insight.safety_score)}`}
              >
                {insight.sentiment.charAt(0).toUpperCase() + insight.sentiment.slice(1)}
              </span>
            </div>
            
            <p className="text-sm text-gray-700 mt-1 line-clamp-3">{insight.body}</p>
            
            <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
              <span>Posted {formatDate(insight.created_at)}</span>
              <a 
                href={insight.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                View source
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 