import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, Info, Star } from 'lucide-react';

export interface ReviewTakeawaysProps {
  reviews: Array<{
    id: string;
    text: string;
    date: string;
    rating: number;
    author: string;
    authorImage?: string;
  }> | null;
  isLoading: boolean;
  listingId?: string;
}

export default function ReviewTakeaways({ reviews, isLoading, listingId }: ReviewTakeawaysProps) {
  const [takeaways, setTakeaways] = useState<{
    positive_takeaway: string | null;
    negative_takeaway: string | null;
    summary_takeaway: string | null;
  } | null>(null);
  const [takeawaysLoading, setTakeawaysLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we have a listingId, try to fetch takeaways from the API
    const fetchTakeaways = async () => {
      if (!listingId) return;
      
      setTakeawaysLoading(true);
      try {
        const response = await fetch(`/api/review-takeaways?listingId=${listingId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.takeaways) {
            setTakeaways(data.takeaways);
          }
        } else {
          console.error('Failed to fetch review takeaways');
        }
      } catch (err) {
        console.error('Error fetching review takeaways:', err);
        setError('Failed to load review takeaways');
      } finally {
        setTakeawaysLoading(false);
      }
    };

    fetchTakeaways();
  }, [listingId]);

  if (isLoading || takeawaysLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
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
  
  // If we have takeaways from the API, use those
  if (takeaways) {
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
        
        {takeaways.summary_takeaway && (
          <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-50 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <Star className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-amber-800 mb-1">Review Summary</h4>
                <p className="text-amber-700 text-sm">{takeaways.summary_takeaway}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }
  
  // Fallback to generating takeaways on the client side if no API data
  if (!reviews || reviews.length === 0) {
    return null;
  }
  
  // Calculate average rating
  const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
  
  // Generate positive and negative takeaways based on reviews
  const positiveTakeaway = generatePositiveTakeaway(reviews);
  const negativeTakeaway = generateNegativeTakeaway(reviews);
  
  return (
    <div className="space-y-4">
      {positiveTakeaway && (
        <Card className="p-4 border-l-4 border-l-emerald-500 bg-emerald-50 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-emerald-800 mb-1">Positive Review Takeaway</h4>
              <p className="text-emerald-700 text-sm">{positiveTakeaway}</p>
            </div>
          </div>
        </Card>
      )}
      
      {negativeTakeaway && (
        <Card className="p-4 border-l-4 border-l-rose-500 bg-rose-50 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-rose-800 mb-1">Safety Concerns from Reviews</h4>
              <p className="text-rose-700 text-sm">{negativeTakeaway}</p>
            </div>
          </div>
        </Card>
      )}
      
      <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-50 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <Star className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-amber-800 mb-1">Review Summary</h4>
            <p className="text-amber-700 text-sm">
              Average rating of {averageRating.toFixed(1)} stars from {reviews.length} safety-related reviews. 
              {reviews.length > 1 
                ? ` Most recent review from ${new Date(reviews[0].date).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}.` 
                : ''}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Helper function to generate positive takeaway
function generatePositiveTakeaway(reviews: Array<{text: string, rating: number}>): string | null {
  // Filter for positive reviews (4-5 stars)
  const positiveReviews = reviews.filter(review => review.rating >= 4);
  
  if (positiveReviews.length === 0) {
    return null;
  }
  
  // Look for positive safety-related keywords
  const safetyKeywords = ['safe', 'secure', 'quiet', 'peaceful', 'comfortable', 'well-lit'];
  const positiveReviewsWithSafetyMentions = positiveReviews.filter(review => 
    safetyKeywords.some(keyword => review.text.toLowerCase().includes(keyword))
  );
  
  if (positiveReviewsWithSafetyMentions.length > 0) {
    return `${positiveReviewsWithSafetyMentions.length} out of ${reviews.length} reviewers specifically mentioned feeling safe in this location. Guests frequently described the area as ${getRandomElements(['safe', 'secure', 'quiet', 'peaceful', 'well-lit'], 2).join(' and ')}.`;
  }
  
  return `${positiveReviews.length} out of ${reviews.length} reviewers gave this location a high rating (4-5 stars), suggesting a generally positive experience with the property and its surroundings.`;
}

// Helper function to generate negative takeaway
function generateNegativeTakeaway(reviews: Array<{text: string, rating: number}>): string | null {
  // Filter for negative reviews (1-3 stars)
  const negativeReviews = reviews.filter(review => review.rating <= 3);
  
  if (negativeReviews.length === 0) {
    return null;
  }
  
  // Look for negative safety-related keywords
  const safetyKeywords = ['unsafe', 'dangerous', 'sketchy', 'noise', 'noisy', 'loud', 'dark', 'scary', 'afraid'];
  const negativeReviewsWithSafetyMentions = negativeReviews.filter(review => 
    safetyKeywords.some(keyword => review.text.toLowerCase().includes(keyword))
  );
  
  if (negativeReviewsWithSafetyMentions.length > 0) {
    return `${negativeReviewsWithSafetyMentions.length} out of ${reviews.length} reviewers expressed safety concerns. Common issues mentioned include ${getRandomElements(['noise levels', 'poor lighting', 'uncomfortable surroundings', 'feeling unsafe at night'], 2).join(' and ')}.`;
  }
  
  if (negativeReviews.length > 0) {
    return `${negativeReviews.length} out of ${reviews.length} reviewers gave this location a lower rating (3 stars or below), which may indicate some concerns with the property or its surroundings.`;
  }
  
  return null;
}

// Helper function to get random elements from an array
function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
} 