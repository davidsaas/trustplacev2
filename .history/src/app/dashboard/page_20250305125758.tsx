"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Basic URL validation
      if (!url) {
        throw new Error("Please enter an Airbnb URL");
      }

      if (!url.includes("airbnb.com")) {
        throw new Error("Please enter a valid Airbnb URL");
      }

      // Check if URL is for NYC or LA
      const isNYC = url.toLowerCase().includes("new-york") || url.toLowerCase().includes("ny");
      const isLA = url.toLowerCase().includes("los-angeles") || url.toLowerCase().includes("la");

      if (!isNYC && !isLA) {
        throw new Error("This tool only supports listings in New York City and Los Angeles");
      }

      // In a real implementation, we would save the URL to the database and process it
      // For now, just redirect to a dummy report page with the URL as a query parameter
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="font-bold text-xl">AirSafe</div>
          <Button variant="ghost" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </header>
      
      <main className="container max-w-6xl mx-auto py-8 px-4">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Check Safety for Airbnb Listings</h1>
            <p className="text-muted-foreground">
              Enter an Airbnb listing URL from NYC or LA to get a comprehensive safety report
            </p>
          </div>
          
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle>Enter Airbnb URL</CardTitle>
              <CardDescription>
                Paste the full URL of the Airbnb listing you want to analyze
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="url">Airbnb URL</Label>
                  <Input
                    id="url"
                    placeholder="https://www.airbnb.com/rooms/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Analyzing..." : "Generate Safety Report"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Currently, we only support listings in New York City and Los Angeles.
            </CardFooter>
          </Card>

          <Card className="mx-auto max-w-2xl mt-8">
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-[24px_1fr] gap-4 items-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium">Enter an Airbnb listing URL</h3>
                    <p className="text-sm text-muted-foreground">
                      Paste the URL of any Airbnb listing in NYC or LA
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-[24px_1fr] gap-4 items-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    2
                  </div>
                  <div>
                    <h3 className="font-medium">We analyze the listing</h3>
                    <p className="text-sm text-muted-foreground">
                      Our system retrieves OpenStreetMap safety data for the neighborhood
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-[24px_1fr] gap-4 items-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium">Get your safety report</h3>
                    <p className="text-sm text-muted-foreground">
                      View a comprehensive safety report with metrics, reviews, and alternatives
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 