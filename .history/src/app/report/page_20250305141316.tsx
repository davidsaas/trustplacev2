"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MapView } from "@/components/map-view";
import { ApifyListing, fetchLAListings, calculateSafetyScore, extractSafetyReviews, findSaferAlternatives, normalizeAirbnbUrl } from "@/lib/apify";

export default function ReportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams?.get("url");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<ApifyListing | null>(null);
  const [safetyScore, setSafetyScore] = useState<number>(0);
  const [safetyReviews, setSafetyReviews] = useState<Array<{
    id: string;
    text: string;
    date: string;
    rating: number;
    author: string;
  }>>([]);
  const [alternatives, setAlternatives] = useState<ApifyListing[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      if (!url) {
        setError("No Airbnb URL provided");
        setIsLoading(false);
        return;
      }

      try {
        const { success, data: listings, error } = await fetchLAListings();
        
        if (!success || !listings) {
          throw new Error(error || 'Failed to fetch listings');
        }

        // Log ALL fields of the first listing
        console.log('Complete listing object keys:', Object.keys(listings[0]));
        
        // Check if pictureUrl exists on any level
        const firstListing = listings[0] as any; // Use any for exploration
        console.log('Looking for image fields:');
        console.log('pictureUrl on listing?', firstListing.pictureUrl);
        console.log('thumbnail on listing?', firstListing.thumbnail);
        console.log('image on listing?', firstListing.image);
        console.log('imagePath on listing?', firstListing.imagePath);
        
        if (firstListing.reviews?.details?.reviews?.[0]?.author) {
          console.log('author.pictureUrl?', (firstListing.reviews.details.reviews[0].author as any).pictureUrl);
        }

        // Normalize the URL we're looking for
        const normalizedSearchUrl = normalizeAirbnbUrl(url);
        console.log('Searching for listing with URL:', normalizedSearchUrl);

        // Find the listing that matches the normalized URL
        const matchingListing = listings.find(l => 
          normalizeAirbnbUrl(l.url) === normalizedSearchUrl
        );
        
        if (!matchingListing) {
          console.log('Available listings:', listings.map(l => ({ url: l.url, normalized: normalizeAirbnbUrl(l.url) })));
          throw new Error('Listing not found');
        }

        console.log('Found matching listing:', JSON.stringify(matchingListing, null, 2));

        // Calculate safety metrics
        const score = calculateSafetyScore(matchingListing);
        const reviews = extractSafetyReviews(matchingListing);
        const saferOptions = findSaferAlternatives(matchingListing, listings);

        console.log('Safety score:', score);
        console.log('Safety reviews:', JSON.stringify(reviews, null, 2));
        console.log('Safer alternatives:', JSON.stringify(saferOptions, null, 2));

        setListing(matchingListing);
        setSafetyScore(score);
        setSafetyReviews(reviews);
        setAlternatives(saferOptions);
      } catch (err) {
        console.error('Error processing listing:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [url, router]);

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleSaveReport = async () => {
    if (!listing) return;
    
    try {
      setSaving(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError("You must be logged in to save reports");
        setSaving(false);
        return;
      }
      
      const { error } = await supabase
        .from('saved_reports')
        .insert({
          user_id: session.user.id,
          listing_url: url || '',
          listing_title: listing.title,
          safety_score: safetyScore,
        });
        
      if (error) throw error;
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving report:", err);
      setError("Failed to save report. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Safety Report</h1>
          <Button
            variant="outline"
            onClick={handleBackToDashboard}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Safety Report</h1>
          <Button
            variant="outline"
            onClick={handleBackToDashboard}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Safety Report</h1>
        <Button
          variant="outline"
          onClick={handleBackToDashboard}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {saveSuccess && (
        <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Report saved successfully!</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <div className="rounded-t-lg overflow-hidden max-h-64">
              <img
                src="/images/placeholder-home.jpg"
                alt={listing.title}
                className="w-full object-cover"
              />
            </div>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{listing.title}</h2>
                  <p className="text-muted-foreground">
                    {listing.location.city}, {listing.location.state}
                  </p>
                  <p className="mt-2">{listing.price.amount ? `$${listing.price.amount} per night` : 'Price not available'}</p>
                </div>
                <Badge className={getSafetyScoreColor(safetyScore)}>
                  Safety Score: {safetyScore}
                </Badge>
              </div>
              <div className="mt-4">
                <Button 
                  onClick={handleSaveReport}
                  disabled={saving || saveSuccess}
                  className="w-full"
                >
                  {saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Report"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location & Neighborhood</CardTitle>
              <CardDescription>
                {listing.location.city}, {listing.location.state}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MapView 
                location={`${listing.location.city}, ${listing.location.state}`}
                safetyScore={safetyScore}
                coordinates={[listing.location.coordinates.lng, listing.location.coordinates.lat]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Safety-Related Reviews</CardTitle>
              <CardDescription>
                Reviews from guests mentioning safety
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {safetyReviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <p className="italic">"{review.text}"</p>
                  <div className="mt-2 text-sm text-muted-foreground">
                    - {review.author}, {new Date(review.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {safetyReviews.length === 0 && (
                <p className="text-muted-foreground">
                  No safety-related reviews found for this listing.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Safer Alternatives</CardTitle>
              <CardDescription>
                Similar listings with better safety scores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {alternatives.map((alt) => (
                <div
                  key={alt.id}
                  className="flex gap-3 pb-4 border-b last:border-0 last:pb-0"
                >
                  <div className="h-16 w-16 rounded-md overflow-hidden flex-shrink-0">
                    <img
                      src="/images/placeholder-home.jpg"
                      alt={alt.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium line-clamp-1">{alt.title}</p>
                    <p className="text-sm">{alt.price.amount ? `$${alt.price.amount}/night` : 'Price not available'}</p>
                    <Badge className={getSafetyScoreColor(calculateSafetyScore(alt))}>
                      Safety: {calculateSafetyScore(alt)}
                    </Badge>
                  </div>
                </div>
              ))}
              {alternatives.length === 0 && (
                <p className="text-muted-foreground">
                  No safer alternatives found at similar price points.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 