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
import { Shield, MapPin, Star, ArrowRight } from "lucide-react";

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
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50/50 to-white">
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Check Airbnb Safety</h2>
          <p className="text-gray-600 max-w-lg mx-auto">
            Enter an Airbnb listing URL from NYC or LA to get a comprehensive
            safety report.
          </p>
        </div>

        <Card className="mb-8 bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url" className="text-gray-700">Airbnb Listing URL</Label>
                <Input
                  id="url"
                  type="text"
                  placeholder="https://www.airbnb.com/rooms/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="bg-white/70 border-gray-200 focus:border-blue-300 focus:ring-blue-300"
                />
              </div>
              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}
              <Button 
                type="submit" 
                className="w-full bg-blue-600/90 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all" 
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Generate Safety Report"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-900">How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                <li>Paste an Airbnb listing URL from NYC or LA</li>
                <li>Our system analyzes the listing's location and reviews</li>
                <li>We generate safety metrics and a safety score</li>
                <li>View detailed safety information and safer alternatives</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-900">What You'll Get</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
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
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-blue-100/50 shadow-sm hover:shadow-md transition-all">
            <div className="bg-blue-100/70 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Safety Scores</h3>
            <p className="text-gray-600">
              Get detailed safety metrics based on crime data, neighborhood reviews, and local insights.
            </p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-emerald-100/50 shadow-sm hover:shadow-md transition-all">
            <div className="bg-emerald-100/70 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Neighborhood Analysis</h3>
            <p className="text-gray-600">
              Understand the area with walkability scores, public transport options, and nearby amenities.
            </p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-amber-100/50 shadow-sm hover:shadow-md transition-all">
            <div className="bg-amber-100/70 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Star className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Verified Reviews</h3>
            <p className="text-gray-600">
              Read safety-focused reviews from real travelers who have stayed at the property.
            </p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/saved')}
            className="bg-white/70 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-all"
          >
            View Saved Reports
          </Button>
        </div>
      </main>
    </div>
  );
} 