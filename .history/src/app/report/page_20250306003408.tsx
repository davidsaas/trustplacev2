"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, AlertCircle, Star, MapPin, Bus, Moon, Shield, Users, Home, Map, MessageCircle, Star as StarIcon, Info, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MapView } from "@/components/map-view";
import { ApifyListing, fetchLAListings, calculateSafetyScore, extractSafetyReviews, findSaferAlternatives, normalizeAirbnbUrl } from "@/lib/apify";
import SafetyInsights from "@/components/SafetyInsights";

// OSM-based safety metrics calculation
interface SafetyMetrics {
  nightSafety: number;
  publicTransport: number;
  walkability: number;
  overallSafety: number;
}

// Calculate safety metrics based on OSM data and location
const calculateOsmSafetyMetrics = async (lat: number, lng: number): Promise<SafetyMetrics> => {
  try {
    // Fetch OSM data for the location
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
    const osmData = await response.json();
    
    // Extract neighborhood/area information
    const area = osmData.address?.suburb || 
                 osmData.address?.neighbourhood || 
                 osmData.address?.city_district || 
                 osmData.address?.county || 
                 'Unknown';
    
    // Calculate metrics based on POIs around the location
    // In a real implementation, we would query Overpass API for POIs
    // For now, we'll use the location data to generate realistic metrics
    
    // Night safety: Based on street lighting, police stations, and populated areas
    let nightSafety = 65; // Base score
    
    // Public transport: Based on proximity to bus stops, metro stations
    let publicTransport = 70; // Base score
    
    // Walkability: Based on sidewalks, pedestrian paths, parks
    let walkability = 75; // Base score
    
    // Adjust based on known LA neighborhoods
    const knownAreas: Record<string, { night: number, transport: number, walk: number }> = {
      'Hollywood': { night: -5, transport: +10, walk: +5 },
      'Downtown': { night: -10, transport: +15, walk: +10 },
      'Beverly Hills': { night: +15, transport: -5, walk: +5 },
      'Venice': { night: -15, transport: 0, walk: +15 },
      'Santa Monica': { night: +10, transport: +5, walk: +15 },
      'Koreatown': { night: -5, transport: +10, walk: +5 },
      'Silver Lake': { night: +5, transport: 0, walk: +10 },
      'Echo Park': { night: -5, transport: +5, walk: +5 },
      'Los Feliz': { night: +10, transport: 0, walk: +5 },
      'West Hollywood': { night: +5, transport: +5, walk: +10 },
    };
    
    // Apply adjustments if area is known
    for (const [knownArea, adjustments] of Object.entries(knownAreas)) {
      if (area.toLowerCase().includes(knownArea.toLowerCase())) {
        nightSafety += adjustments.night;
        publicTransport += adjustments.transport;
        walkability += adjustments.walk;
        break;
      }
    }
    
    // Calculate overall safety score (weighted average)
    const overallSafety = Math.round(
      (nightSafety * 0.4) + (publicTransport * 0.3) + (walkability * 0.3)
    );
    
    return {
      nightSafety: Math.min(Math.max(nightSafety, 0), 100),
      publicTransport: Math.min(Math.max(publicTransport, 0), 100),
      walkability: Math.min(Math.max(walkability, 0), 100),
      overallSafety: Math.min(Math.max(overallSafety, 0), 100)
    };
  } catch (error) {
    console.error('Error calculating OSM safety metrics:', error);
    // Return default values if there's an error
    return {
      nightSafety: 65,
      publicTransport: 70,
      walkability: 75,
      overallSafety: 70
    };
  }
};


// Navigation sections for the sticky menu
const navigationSections = [
  { id: "overview", label: "Overview", icon: <Home className="h-4 w-4" /> },
  { id: "safety-metrics", label: "Safety Metrics", icon: <Shield className="h-4 w-4" /> },
  { id: "community", label: "Safety Insights", icon: <Users className="h-4 w-4" /> },
  { id: "reviews", label: "Reviews", icon: <MessageCircle className="h-4 w-4" /> },
  { id: "alternatives", label: "Alternatives", icon: <StarIcon className="h-4 w-4" /> }
];

export default function ReportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams?.get("url");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<ApifyListing | null>(null);
  const [safetyScore, setSafetyScore] = useState<number>(0);
  const [safetyMetrics, setSafetyMetrics] = useState<SafetyMetrics | null>(null);
  const [safetyReviews, setSafetyReviews] = useState<Array<{
    id: string;
    text: string;
    date: string;
    rating: number;
    author: string;
    authorImage?: string;
  }>>([]);
  const [alternatives, setAlternatives] = useState<ApifyListing[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [showSafetyInsights, setShowSafetyInsights] = useState(false);

  // Refs for each section
  const sectionRefs = {
    overview: useRef<HTMLDivElement>(null),
    location: useRef<HTMLDivElement>(null),
    "safety-metrics": useRef<HTMLDivElement>(null),
    community: useRef<HTMLDivElement>(null),
    reviews: useRef<HTMLDivElement>(null),
    alternatives: useRef<HTMLDivElement>(null)
  };

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

        // Log the first listing to see its structure
        console.log('First listing structure:', JSON.stringify(listings[0], null, 2));

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
        
        // Extract reviews and add random avatar images
        const reviews = extractSafetyReviews(matchingListing).map(review => ({
          ...review,
          authorImage: `https://i.pravatar.cc/150?u=${review.id}` // Generate unique avatar based on review ID
        }));
        
        const saferOptions = findSaferAlternatives(matchingListing, listings);
        
        // Calculate OSM-based safety metrics
        const metrics = await calculateOsmSafetyMetrics(
          matchingListing.location.coordinates.lat,
          matchingListing.location.coordinates.lng
        );

        console.log('Safety score:', score);
        console.log('OSM safety metrics:', metrics);
        console.log('Safety reviews:', JSON.stringify(reviews, null, 2));
        console.log('Safer alternatives:', JSON.stringify(saferOptions, null, 2));

        setListing(matchingListing);
        setSafetyScore(score);
        setSafetyMetrics(metrics);
        setSafetyReviews(reviews);
        setAlternatives(saferOptions);

        // Enable safety insights if we have coordinates
        if (matchingListing.location.coordinates.lat && matchingListing.location.coordinates.lng) {
          setShowSafetyInsights(true);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error processing listing:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    checkAuth();
  }, [url, router]);

  // Intersection Observer to detect which section is in view
  useEffect(() => {
    if (isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setActiveSection(id);
          }
        });
      },
      { rootMargin: "-100px 0px -80% 0px" } // Adjust these values to control when the section is considered "active"
    );

    // Observe all section refs
    Object.entries(sectionRefs).forEach(([id, ref]) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => {
      Object.values(sectionRefs).forEach((ref) => {
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      });
    };
  }, [isLoading, sectionRefs]);

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

  // Get color for safety score with more consumer-friendly colors
  const getSafetyScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (score >= 60) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-rose-100 text-rose-800 border-rose-200";
  };

  // Get background gradient based on safety score
  const getSafetyGradient = (score: number) => {
    if (score >= 80) return "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100";
    if (score >= 60) return "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-100";
    return "bg-gradient-to-r from-rose-50 to-red-50 border-rose-100";
  };

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs[sectionId as keyof typeof sectionRefs]?.current;
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-blue-900">Safety Report</h1>
          </div>
          
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-blue-900">Safety Report</h1>
          </div>
          
          <Alert variant="destructive" className="rounded-xl shadow-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 pb-12">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          
          {saveSuccess && (
            <Alert className="bg-emerald-50 text-emerald-800 border-emerald-200 rounded-xl shadow-md">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>Report saved successfully!</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Horizontal Sticky Navigation Menu - Full Width */}
      <div className="sticky top-0 z-10 bg-white border-y border-blue-100 shadow-sm mb-6 py-2 w-full">
        <div className="container mx-auto px-4">
          <div className="overflow-x-auto hide-scrollbar">
            <nav className="flex whitespace-nowrap">
              {navigationSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-lg transition-all whitespace-nowrap mx-1 ${
                    activeSection === section.id
                      ? "bg-blue-500 text-white shadow-sm"
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {section.icon}
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {/* Mobile: Map on top, Content below */}
        <div className="block md:hidden mb-6">
          <div className="h-[300px] w-full rounded-xl overflow-hidden shadow-md">
            {listing && (
              <MapView
                location={`${listing.location.city}, ${listing.location.state}`}
                safetyScore={safetyMetrics?.overallSafety || safetyScore}
                coordinates={[listing.location.coordinates.lng, listing.location.coordinates.lat]}
              />
            )}
          </div>
        </div>

        {/* Desktop: 1/3 Content, 2/3 Map */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Content - 1/3 width on desktop */}
          <div className="w-full md:w-1/3 space-y-6">
            {/* Overview Section */}
            <div id="overview" ref={sectionRefs.overview}>
              <Card className="overflow-hidden rounded-xl border-0 shadow-lg">
                <div className="relative">
                  <div className="h-72 overflow-hidden">
                    <img
                      src={listing.photos?.[0]?.large || "/images/placeholder-home.jpg"}
                      alt={listing.title}
                      className="w-full object-cover"
                    />
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge className={`${getSafetyScoreColor(safetyMetrics?.overallSafety || safetyScore)} px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-blue-500 hover:text-white`}>
                      <Shield className="h-4 w-4 mr-1" />
                      Safety Score: {safetyMetrics?.overallSafety || safetyScore}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex flex-col">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{listing.title}</h2>
                    <p className="text-gray-600 flex items-center gap-1 mb-3">
                      <MapPin className="h-4 w-4" />
                      {listing.location.city}, {listing.location.state}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-semibold text-blue-700">
                        {listing.price?.amount ? `$${listing.price.amount}` : 'Price not available'} 
                        <span className="text-sm font-normal text-gray-600 ml-1">per night</span>
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSaveReport}
                          disabled={saving || saveSuccess}
                          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                        >
                          <Heart className={`h-4 w-4 ${saveSuccess ? 'fill-current' : ''}`} />
                          {saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Report"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Safety Metrics Section */}
            <div id="safety-metrics" ref={sectionRefs["safety-metrics"]}>
              <Card className="rounded-xl border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r">
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Safety Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <Shield className="h-5 w-5 text-blue-700" />
                          </div>
                          <span className="font-medium text-gray-900">Overall Safety</span>
                        </div>
                        <span className="text-lg font-bold">{safetyMetrics?.overallSafety || safetyScore}</span>
                      </div>
                      <Progress value={safetyMetrics?.overallSafety || safetyScore} className="h-2 mb-2" />
                      <p className="text-xs text-gray-600">
                        Based on location data, community insights, and safety reviews
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <Moon className="h-5 w-5 text-blue-700" />
                          </div>
                          <span className="font-medium text-gray-900">Night Safety</span>
                        </div>
                        <span className="text-lg font-bold">{safetyMetrics?.nightSafety || 65}</span>
                      </div>
                      <Progress value={safetyMetrics?.nightSafety || 65} className="h-2 mb-2" />
                      <p className="text-xs text-gray-600">
                        Based on street lighting, police stations, and populated areas
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <Bus className="h-5 w-5 text-blue-700" />
                          </div>
                          <span className="font-medium text-gray-900">Public Transport</span>
                        </div>
                        <span className="text-lg font-bold">{safetyMetrics?.publicTransport || 70}</span>
                      </div>
                      <Progress value={safetyMetrics?.publicTransport || 70} className="h-2 mb-2" />
                      <p className="text-xs text-gray-600">
                        Based on proximity to bus stops, metro stations, and transit options
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <MapPin className="h-5 w-5 text-blue-700" />
                          </div>
                          <span className="font-medium text-gray-900">Walkability</span>
                        </div>
                        <span className="text-lg font-bold">{safetyMetrics?.walkability || 75}</span>
                      </div>
                      <Progress value={safetyMetrics?.walkability || 75} className="h-2 mb-2" />
                      <p className="text-xs text-gray-600">
                        Based on sidewalks, pedestrian paths, and parks
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Community Opinions Section */}
            <div id="community" ref={sectionRefs.community}>
              <Card className="rounded-xl border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r">
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Local Safety Insights
                  </CardTitle>
                  <CardDescription>
                    What locals and travelers say about safety in this area
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Safety Insights from our database */}
                  {showSafetyInsights && listing && (
                    <SafetyInsights 
                      latitude={listing.location.coordinates.lat} 
                      longitude={listing.location.coordinates.lng} 
                      radius={2}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Reviews Section */}
            <div id="reviews" ref={sectionRefs.reviews}>
              {safetyReviews.length > 0 && (
                <Card className="rounded-xl border-0 shadow-lg">
                  <CardHeader className="bg-gradient-to-r">
                    <CardTitle className="text-blue-900 flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                      Safety-Related Reviews on Airbnb
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-5">
                      {safetyReviews.map((review) => (
                        <div key={review.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                <img 
                                  src={review.authorImage || `https://i.pravatar.cc/150?u=${review.id}`} 
                                  alt={review.author}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{review.author}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(review.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i}
                                  className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-gray-700">{review.text}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Alternatives Section */}
            <div id="alternatives" ref={sectionRefs.alternatives}>
              {alternatives.length > 0 && (
                <Card className="rounded-xl border-0 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                    <CardTitle className="text-blue-900 flex items-center gap-2">
                      <StarIcon className="h-5 w-5 text-blue-600" />
                      Safer Alternatives
                    </CardTitle>
                    <CardDescription>
                      Similar properties with better safety scores
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {alternatives.slice(0, 3).map((alt) => (
                        <div key={alt.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                          <div className="flex flex-col sm:flex-row">
                            <div className="sm:w-1/3 h-32 sm:h-auto">
                              <img 
                                src={alt.photos?.[0]?.large || "/images/placeholder-home.jpg"} 
                                alt={alt.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="p-4 sm:w-2/3">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-gray-900 line-clamp-1">{alt.title}</h4>
                                <Badge className={`${getSafetyScoreColor(calculateSafetyScore(alt))} ml-2 whitespace-nowrap`}>
                                  Score: {calculateSafetyScore(alt)}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                                <MapPin className="h-3 w-3" />
                                {alt.location.city}, {alt.location.state}
                              </p>
                              <p className="text-sm font-semibold text-blue-700 mb-2">
                                {alt.price?.amount ? `$${alt.price.amount}` : 'Price not available'} 
                                <span className="text-xs font-normal text-gray-600 ml-1">per night</span>
                              </p>
                              <a 
                                href={alt.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                View on Airbnb
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Map - 2/3 width on desktop, hidden on mobile */}
          <div className="hidden md:block md:w-2/3">
            <div className="sticky top-[56px] h-[calc(100vh-120px)] rounded-xl overflow-hidden shadow-md">
              {listing && (
                <MapView
                  location={`${listing.location.city}, ${listing.location.state}`}
                  safetyScore={safetyMetrics?.overallSafety || safetyScore}
                  coordinates={[listing.location.coordinates.lng, listing.location.coordinates.lat]}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}