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
import { Shield, MapPin, Star, ArrowRight, AlertTriangle, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isPremium } = useAuth();

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-100">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Safety Report Dashboard</h1>

        {!isPremium && (
          <div className="mb-8 p-4 border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Sparkles className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-900">Upgrade to Premium</h3>
                  <p className="text-sm text-blue-600">Get detailed safety metrics, unlimited reports, and more.</p>
                </div>
              </div>
              <Button 
                onClick={() => router.push('/premium')}
                className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap flex items-center gap-2"
              >
                Upgrade Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

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
              <CardTitle>How It Works</CardTitle>
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
              <CardTitle>What You'll Get</CardTitle>
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