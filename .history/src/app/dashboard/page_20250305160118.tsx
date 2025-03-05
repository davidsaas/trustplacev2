"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { fetchLAListings, ApifyListing, normalizeAirbnbUrl } from "@/lib/apify";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, MapPin, Star, ArrowRight, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Basic URL validation
      if (!url) {
        throw new Error("Please enter an Airbnb URL");
      }

      if (!url.includes("airbnb.com/rooms/")) {
        throw new Error("Please enter a valid Airbnb listing URL");
      }

      // Normalize the input URL
      const normalizedUrl = normalizeAirbnbUrl(url);

      // Fetch LA listings and check if the URL exists
      const { success, data: listings, error: fetchError } = await fetchLAListings();
      
      if (!success || !listings) {
        throw new Error(fetchError || "Failed to fetch listings");
      }

      const matchingListing = listings.find((listing: ApifyListing) => 
        normalizeAirbnbUrl(listing.url) === normalizedUrl
      );
      
      if (!matchingListing) {
        throw new Error("This tool only supports listings in Los Angeles. The provided listing was not found in our LA dataset.");
      }

      // If we get here, the listing exists in our LA dataset
      const encodedUrl = encodeURIComponent(normalizedUrl);
      router.push(`/report?url=${encodedUrl}`);
    } catch (error: any) {
      setError(error.message || "An error occurred while processing your request");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-safety-green/10 rounded-full blur-3xl -z-10 transform translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-brand/10 rounded-full blur-3xl -z-10 transform -translate-x-1/3 translate-y-1/3"></div>
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-2">
            <div className="safety-indicator">
              <span className="safety-dot safety-dot-red"></span>
              <span className="safety-dot safety-dot-yellow"></span>
              <span className="safety-dot safety-dot-green"></span>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-2 text-brand">Check Airbnb Safety</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Enter an Airbnb listing URL from Los Angeles to get a comprehensive
            safety report.
          </p>
        </div>

        <Card className="mb-8 glass">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Airbnb Listing URL</Label>
                <Input
                  id="url"
                  type="text"
                  placeholder="https://www.airbnb.com/rooms/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="bg-background/50"
                />
              </div>
              {error && (
                <Alert variant="destructive" className="bg-safety-red/10 text-safety-red border-safety-red/20">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button 
                type="submit" 
                className="w-full bg-brand hover:bg-brand/90 text-white" 
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Generate Safety Report"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="glass hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-brand">How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 space-y-2 text-foreground">
                <li>Paste an Airbnb listing URL from Los Angeles</li>
                <li>Our system analyzes the listing's location and reviews</li>
                <li>We generate safety metrics and a safety score</li>
                <li>View detailed safety information and safer alternatives</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="glass hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-brand">What You'll Get</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-foreground">
                <li>Overall safety score for the listing</li>
                <li>Neighborhood safety metrics</li>
                <li>Safety-related reviews from previous guests</li>
                <li>Safer alternatives at similar price points</li>
                <li>Interactive map with safety overlay</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass p-6 rounded-xl hover:shadow-md transition-all">
            <div className="bg-safety-red/20 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-safety-red" />
            </div>
            <h3 className="text-xl font-semibold text-brand mb-2">Safety Scores</h3>
            <p className="text-foreground">
              Get detailed safety metrics based on crime data, neighborhood reviews, and local insights.
            </p>
          </div>
          
          <div className="glass p-6 rounded-xl hover:shadow-md transition-all">
            <div className="bg-safety-yellow/20 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-safety-yellow" />
            </div>
            <h3 className="text-xl font-semibold text-brand mb-2">Neighborhood Analysis</h3>
            <p className="text-foreground">
              Understand the area with walkability scores, public transport options, and nearby amenities.
            </p>
          </div>
          
          <div className="glass p-6 rounded-xl hover:shadow-md transition-all">
            <div className="bg-safety-green/20 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Star className="h-6 w-6 text-safety-green" />
            </div>
            <h3 className="text-xl font-semibold text-brand mb-2">Verified Reviews</h3>
            <p className="text-foreground">
              Read safety-focused reviews from real travelers who have stayed at the property.
            </p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/saved')}
            className="bg-background/50 hover:bg-accent hover:text-accent-foreground transition-all mr-2"
          >
            View Saved Reports
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="bg-background/50 hover:bg-safety-red/10 hover:text-safety-red transition-all"
          >
            Sign Out
          </Button>
        </div>
      </main>
    </div>
  );
} 