import React, { useEffect, useState, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, Star, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Database } from '@/lib/supabase-types';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  const dataFetchedRef = useRef<boolean>(false);
  
  const handleShowMore = () => {
    setVisibleCount(prev => prev + 5);
  };

  useEffect(() => {
    const fetchTakeaways = async () => {
      if (!reviews || !listingId || dataFetchedRef.current) return;
      
      try {
        setTakeawaysLoading(true);
        console.log(`Fetching takeaways for listing ${listingId} with ${reviews.length} reviews`);
        
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
          } else {
            console.error('API returned success: false', data);
            // Use fallback takeaways
            setTakeaways({
              id: 'temp',
              listing_id: listingId,
              positive_takeaway: "No specific safety praise was identified in the available reviews.",
              negative_takeaway: "No specific safety concerns were identified in the available reviews.",
              review_summary: "Safety was not a prominent topic in the reviews for this location.",
              average_rating: reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length,
              review_count: reviews.length,
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 86400000).toISOString()
            });
          }
        } else {
          console.error('Error response from API:', response.status);
          // Use fallback takeaways
          setTakeaways({
            id: 'temp',
            listing_id: listingId,
            positive_takeaway: "No specific safety praise was identified in the available reviews.",
            negative_takeaway: "No specific safety concerns were identified in the available reviews.",
            review_summary: "Safety was not a prominent topic in the reviews for this location.",
            average_rating: reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length,
            review_count: reviews.length,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 86400000).toISOString()
          });
        }
        // Mark the data as fetched to avoid re-fetching on scroll
        dataFetchedRef.current = true;
      } catch (error) {
        console.error('Error fetching review takeaways:', error);
        // Use fallback takeaways
        setTakeaways({
          id: 'temp',
          listing_id: listingId,
          positive_takeaway: "No specific safety praise was identified in the available reviews.",
          negative_takeaway: "No specific safety concerns were identified in the available reviews.",
          review_summary: "Safety was not a prominent topic in the reviews for this location.",
          average_rating: reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length,
          review_count: reviews.length,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString()
        });
        // Even on error, mark as fetched to prevent continuous retries on scroll
        dataFetchedRef.current = true;
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
  
  // Only show initial loading state, not when scrolling
  if (isLoading && !dataFetchedRef.current) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }
  
  // Even if we don't have takeaways, still show reviews if available
  const hasReviews = reviews && reviews.length > 0;
  const hasTakeaways = !!takeaways;
  
  if (!hasReviews) {
    return <p className="text-gray-500">No reviews available for this listing.</p>;
  }
  
  return (
    <div>
      {/* Takeaways Section - Only shown if available */}
      {hasTakeaways && (
        <>

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
                        <p className="text-emerald-800">{point.startsWith('✓') ? point.substring(1).trim() : point}</p>
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
                        <p className="text-rose-800">{point.startsWith('⚠️') ? point.substring(2).trim() : point}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No safety concerns reported.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}

      {/* Individual Reviews Section - Only show when toggled */}
      {showIndividualReviews && (
        <div className="mt-8">
          <div className="space-y-4">
            {reviews.slice(0, visibleCount).map((review) => (
              <div 
                key={review.id} 
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <Avatar className="h-10 w-10 bg-white">
                  <AvatarImage src="/images/airbnb-logo.png" alt="Airbnb" />
                  <AvatarFallback>
                    <svg viewBox="0 0 24 24" fill="#FF5A5F" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6">
                      <path d="M12 2C14.5 2 16.5 4 16.5 6.5C16.5 9 15 11.5 12 14.5C9 11.5 7.5 9 7.5 6.5C7.5 4 9.5 2 12 2ZM12 0C8.5 0 5.5 3 5.5 6.5C5.5 10 7.5 13 12 17.5C16.5 13 18.5 10 18.5 6.5C18.5 3 15.5 0 12 0Z" />
                      <path d="M12 5.5C11.2 5.5 10.5 6.2 10.5 7C10.5 7.8 11.2 8.5 12 8.5C12.8 8.5 13.5 7.8 13.5 7C13.5 6.2 12.8 5.5 12 5.5Z" />
                    </svg>
                  </AvatarFallback>
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
            ))}

            {/* Show More Button */}
            {reviews.length > visibleCount && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  className="text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50"
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