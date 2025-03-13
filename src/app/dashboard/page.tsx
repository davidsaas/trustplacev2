"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, AlertTriangle, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { fetchLAListings, ApifyListing, normalizeAirbnbUrl } from "@/lib/apify";

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isPremium, signOut } = useAuth();

  const validateUrl = (url: string) => {
    const airbnbPattern = /^https?:\/\/(www\.)?airbnb\.[a-z.]+\/rooms\/\d+/i;
    const bookingPattern = /^https?:\/\/(www\.)?booking\.com\/hotel\//i;
    
    if (airbnbPattern.test(url)) {
      return { isValid: true, type: 'airbnb' };
    }
    
    if (bookingPattern.test(url)) {
      return { isValid: true, type: 'booking' };
    }
    
    return { isValid: false, type: null };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!url) {
        throw new Error("Please enter a listing URL");
      }

      const validation = validateUrl(url);
      if (!validation.isValid) {
        throw new Error("Please enter a valid Airbnb or Booking.com listing URL");
      }

      if (validation.type === 'airbnb') {
        const normalizedUrl = normalizeAirbnbUrl(url);
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

        router.push(`/report?url=${encodeURIComponent(normalizedUrl)}&type=airbnb`);
      } else {
        router.push(`/report?url=${encodeURIComponent(url)}&type=booking`);
      }
    } catch (error: any) {
      setError(error.message || "An error occurred while processing your request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">
            Verify Your Stay's Safety
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Enter your Airbnb or Booking.com listing URL to get instant safety insights
          </p>

          <Card className="bg-background/50 backdrop-blur-sm border-muted/50">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="Paste your listing URL here..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    className="h-12 bg-background/50 text-lg"
                  />
                  <Button 
                    type="submit" 
                    className="h-12 px-6 bg-brand hover:bg-brand/90 text-white"
                    disabled={loading}
                  >
                    {loading ? "Analyzing..." : "Check Safety"}
                  </Button>
                </div>
                {error && (
                  <Alert variant="destructive" className="bg-safety-red/10 text-safety-red border-safety-red/20">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {!isPremium && (
          <div className="max-w-3xl mx-auto">
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100/50 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100/50 p-2 rounded-full">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm text-blue-600">
                    <span className="font-medium">Upgrade to Premium</span> for detailed safety metrics and unlimited reports
                  </p>
                </div>
                <Button 
                  onClick={() => router.push('/premium')}
                  variant="ghost"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  Learn More
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 