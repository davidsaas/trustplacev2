"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { MapView } from "@/components/map-view";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, AlertCircle } from "lucide-react";

// Mock data for demo purposes
interface MockListing {
  id: string;
  title: string;
  location: string;
  image: string;
  price: number;
  safetyScore: number;
  neighborhood: string;
  reviews: { id: number; text: string; isSafetyRelated: boolean }[];
  alternatives: { id: string; title: string; price: number; safetyScore: number; image: string }[];
  safetyMetrics: {
    lightingScore: number;
    crimeRate: number;
    publicTransport: number;
    walkabilityScore: number;
  };
}

export default function ReportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams?.get("url");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<MockListing | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }

      if (!url) {
        setError("No Airbnb URL provided");
        setLoading(false);
        return;
      }

      // In a real implementation, we would fetch the data from an API
      // For now, use mock data after a delay to simulate loading
      setTimeout(() => {
        // Mock data for demo
        const mockListing: MockListing = {
          id: "12345",
          title: "Cozy Apartment in the Heart of NYC",
          location: "Manhattan, New York, NY",
          image: "https://a0.muscache.com/im/pictures/miso/Hosting-47181423/original/39c9d4e7-78d0-4807-9f0d-3029d987d02a.jpeg",
          price: 150,
          safetyScore: 75,
          neighborhood: "Midtown",
          reviews: [
            { id: 1, text: "Great location, felt very safe walking around at night.", isSafetyRelated: true },
            { id: 2, text: "The building has good security and the area is well lit.", isSafetyRelated: true },
            { id: 3, text: "Comfortable bed and nice amenities.", isSafetyRelated: false },
            { id: 4, text: "Some noise from the street, but overall good experience.", isSafetyRelated: false },
            { id: 5, text: "I was a bit concerned walking back late at night, not many people around.", isSafetyRelated: true },
          ],
          alternatives: [
            { id: "alt1", title: "Modern Loft in Safe Neighborhood", price: 165, safetyScore: 90, image: "https://a0.muscache.com/im/pictures/miso/Hosting-29919648/original/ce62e6e0-d933-4d00-a6d2-2bbaa5c289be.jpeg" },
            { id: "alt2", title: "Secure Building with Doorman", price: 140, safetyScore: 85, image: "https://a0.muscache.com/im/pictures/miso/Hosting-53733023/original/6730c910-fb3a-4891-982c-29105b133efa.jpeg" },
          ],
          safetyMetrics: {
            lightingScore: 80,
            crimeRate: 65,
            publicTransport: 90,
            walkabilityScore: 85,
          },
        };
        
        setListing(mockListing);
        setLoading(false);
      }, 2000);
    };

    checkAuth();
  }, [url, router]);

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950">
        <header className="border-b bg-background">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="font-bold text-xl">AirSafe</div>
            <Button variant="ghost" onClick={handleBackToDashboard}>
              Back to Dashboard
            </Button>
          </div>
        </header>
        
        <main className="container max-w-4xl mx-auto py-8 px-4">
          <div className="space-y-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-1/3" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-1/3" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950">
        <header className="border-b bg-background">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="font-bold text-xl">AirSafe</div>
            <Button variant="ghost" onClick={handleBackToDashboard}>
              Back to Dashboard
            </Button>
          </div>
        </header>
        
        <main className="container max-w-4xl mx-auto py-8 px-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={handleBackToDashboard}>Back to Dashboard</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="font-bold text-xl">AirSafe</div>
          <Button variant="ghost" onClick={handleBackToDashboard}>
            Back to Dashboard
          </Button>
        </div>
      </header>
      
      <main className="container max-w-4xl mx-auto py-8 px-4">
        {listing && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold mb-2">{listing.title}</h1>
              <p className="text-muted-foreground">{listing.location}</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Listing Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="aspect-video overflow-hidden rounded-md">
                      <img 
                        src={listing.image} 
                        alt={listing.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Price per night</p>
                        <p className="text-xl font-bold">${listing.price}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Safety Score</p>
                        <p className={`text-xl font-bold ${getSafetyScoreColor(listing.safetyScore)}`}>
                          {listing.safetyScore}/100
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Safety Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Street Lighting</span>
                      <div className="flex items-center">
                        <div className="bg-slate-200 dark:bg-slate-700 w-32 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full" 
                            style={{ width: `${listing.safetyMetrics.lightingScore}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm font-medium">{listing.safetyMetrics.lightingScore}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Crime Rate (Lower is better)</span>
                      <div className="flex items-center">
                        <div className="bg-slate-200 dark:bg-slate-700 w-32 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              listing.safetyMetrics.crimeRate > 70 ? "bg-green-500" : 
                              listing.safetyMetrics.crimeRate > 40 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${listing.safetyMetrics.crimeRate}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm font-medium">{listing.safetyMetrics.crimeRate}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Public Transport Access</span>
                      <div className="flex items-center">
                        <div className="bg-slate-200 dark:bg-slate-700 w-32 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full" 
                            style={{ width: `${listing.safetyMetrics.publicTransport}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm font-medium">{listing.safetyMetrics.publicTransport}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Walkability</span>
                      <div className="flex items-center">
                        <div className="bg-slate-200 dark:bg-slate-700 w-32 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full" 
                            style={{ width: `${listing.safetyMetrics.walkabilityScore}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm font-medium">{listing.safetyMetrics.walkabilityScore}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Safety-Related Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {listing.reviews
                    .filter(review => review.isSafetyRelated)
                    .map(review => (
                      <div key={review.id} className="p-4 bg-muted rounded-lg">
                        <p className="italic">"{review.text}"</p>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
            
            <div>
              <h2 className="text-xl font-bold mb-4">Safer Alternatives in the Area</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {listing.alternatives.map(alt => (
                  <Card key={alt.id}>
                    <div className="aspect-video overflow-hidden">
                      <img 
                        src={alt.image} 
                        alt={alt.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium">{alt.title}</h3>
                      <div className="flex justify-between mt-2">
                        <p>${alt.price}/night</p>
                        <p className={`font-medium ${getSafetyScoreColor(alt.safetyScore)}`}>
                          Safety: {alt.safetyScore}/100
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                This report was generated based on available data and is meant to be used as a guideline only.
              </p>
              <Button onClick={handleBackToDashboard}>Back to Dashboard</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 