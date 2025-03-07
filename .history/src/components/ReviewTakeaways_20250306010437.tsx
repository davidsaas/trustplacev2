import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, Star } from 'lucide-react';
import type { Database } from '@/lib/supabase-types';

type ReviewTakeaway = Database['public']['Tables']['review_takeaways']['Row'];

export interface ReviewTakeawaysProps {
  reviews: Array<{
    id: string;
    text: string;
    date: string;
    rating: number;
    author: string;
    authorImage?: string;
  }> | null;
  listingId: string;
  isLoading: boolean;
}

export default function ReviewTakeaways({ reviews, listingId, isLoading }: ReviewTakeawaysProps) {
  const [takeaways, setTakeaways] = useState<ReviewTakeaway | null>(null);
  const [takeawaysLoading, setTakeawaysLoading] = useState(true);
  
  useEffect(() => {
    const fetchTakeaways = async () => {
      if (!reviews || !listingId) return;
      
      try {
        const response = await fetch(
          `/api/reviews/takeaways?listing_id=${encodeURIComponent(listingId)}&reviews=${encodeURIComponent(JSON.stringify(reviews))}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.takeaways) {
            setTakeaways(data.takeaways);
          }
        }
      } catch (error) {
        console.error('Error fetching review takeaways:', error);
      } finally {
        setTakeawaysLoading(false);
      }
    };
    
    fetchTakeaways();
  }, [reviews, listingId]);
  
  if (isLoading || takeawaysLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }
  
  if (!takeaways || !reviews || reviews.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-4">
      {takeaways.positive_takeaway && (
        <Card className="p-4 border-l-4 border-l-emerald-500 bg-emerald-50 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-emerald-800 mb-1">Positive Review Takeaway</h4>
              <p className="text-emerald-700 text-sm">{takeaways.positive_takeaway}</p>
            </div>
          </div>
        </Card>
      )}
      
      {takeaways.negative_takeaway && (
        <Card className="p-4 border-l-4 border-l-rose-500 bg-rose-50 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-rose-800 mb-1">Safety Concerns from Reviews</h4>
              <p className="text-rose-700 text-sm">{takeaways.negative_takeaway}</p>
            </div>
          </div>
        </Card>
      )}
      
      <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-50 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <Star className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-amber-800 mb-1">Review Summary</h4>
            <p className="text-amber-700 text-sm">{takeaways.review_summary}</p>
          </div>
        </div>
      </Card>
    </div>
  );
} 