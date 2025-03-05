"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { fetchLAListings, ApifyListing } from "@/lib/apify";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

      // Fetch LA listings and check if the URL exists
      const { success, data: listings, error: fetchError } = await fetchLAListings();
      
      if (!success || !listings) {
        throw new Error(fetchError || "Failed to fetch listings");
      }

      const matchingListing = listings.find(listing => listing.url === url);
      
      if (!matchingListing) {
        throw new Error("This tool only supports listings in Los Angeles. The provided listing was not found in our LA dataset.");
      }

      // If we get here, the listing exists in our LA dataset
      const encodedUrl = encodeURIComponent(url);
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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">AirSafe</h1>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => router.push('/saved')}
              className="hidden sm:flex items-center gap-2"
            >
              Saved Reports
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleSignOut}
              className="text-muted-foreground"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Check Airbnb Safety</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Enter an Airbnb listing URL from NYC or LA to get a comprehensive
            safety report.
          </p>
        </div>

        <Card className="mb-8">
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
                />
              </div>
              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Analyzing..." : "Generate Safety Report"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Paste an Airbnb listing URL from NYC or LA</li>
                <li>Our system analyzes the listing's location and reviews</li>
                <li>We generate safety metrics and a safety score</li>
                <li>View detailed safety information and safer alternatives</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What You'll Get</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2">
                <li>Overall safety score for the listing</li>
                <li>Neighborhood safety metrics</li>
                <li>Safety-related reviews from previous guests</li>
                <li>Safer alternatives at similar price points</li>
                <li>Interactive map with safety overlay</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/saved')}
            className="sm:hidden"
          >
            View Saved Reports
          </Button>
        </div>
      </main>
    </div>
  );
} 