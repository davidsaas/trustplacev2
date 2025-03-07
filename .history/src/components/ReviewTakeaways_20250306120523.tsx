import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, Star, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Database } from '@/lib/supabase-types';
import { Button } from "@/components/ui/button";

type ReviewTakeaway = Database['public']['Tables']['review_takeaways']['Row'];

interface SafetyReview {
  review: {
    id: string;
    text: string;
    date: string;
    rating: number;
    author: string;
    authorImage?: string;
  };
  safetyContext: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

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
  showIndividualReviews?: boolean;
}

export default function ReviewTakeaways({ reviews, listingId, isLoading, showIndividualReviews = false }: ReviewTakeawaysProps) {
  const [takeaways, setTakeaways] = useState<ReviewTakeaway | null>(null);
  const [safetyReviews, setSafetyReviews] = useState<SafetyReview[]>([]);
  const [takeawaysLoading, setTakeawaysLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);
  
  const handleShowMore = () => {
    setVisibleCount(prev => prev + 5);
  };

  useEffect(() => {
    const fetchTakeaways = async () => {
      if (!reviews || !listingId) return;
      
      try {
        const response = await fetch(
          `/api/reviews/takeaways?listing_id=${encodeURIComponent(listingId)}&reviews=${encodeURIComponent(JSON.stringify(reviews))}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTakeaways(data.takeaways);
            if (data.safetyReviews) {
              setSafetyReviews(data.safetyReviews);
            }
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

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
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
    <div className="space-y-6">
      {/* Takeaways Section - Always visible */}
      <div className="space-y-4">
        {takeaways.positive_takeaway && (
          <Card className="p-4 border-l-4 border-l-emerald-500 bg-emerald-50 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-emerald-800 mb-1">Positive Safety Feedback</h4>
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
                <h4 className="font-medium text-rose-800 mb-1">Safety Concerns</h4>
                <p className="text-rose-700 text-sm">{takeaways.negative_takeaway}</p>
              </div>
            </div>
          </Card>
        )}
        
        {takeaways.review_summary && (
          <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-50 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <Star className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-amber-800 mb-1">Overall Summary</h4>
                <p className="text-amber-700 text-sm">{takeaways.review_summary}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Individual Reviews Section - Only show when toggled */}
      {showIndividualReviews && reviews.length > 0 && (
        <div className="mt-8">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Individual Reviews</h4>
          <div className="space-y-4">
            {reviews.slice(0, visibleCount).map((review) => (
              <Card key={review.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={review.authorImage} />
                    <AvatarFallback>{review.author.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{review.author}</span>
                      <span className="text-sm text-gray-500">{formatDate(review.date)}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-gray-700">{review.text}</p>
                  </div>
                </div>
              </Card>
            ))}

            {/* Show More Button */}
            {reviews.length > visibleCount && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  className="text-blue-600 hover:text-blue-800"
                  onClick={handleShowMore}
                >
                  Show {Math.min(5, reviews.length - visibleCount)} More Reviews
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 