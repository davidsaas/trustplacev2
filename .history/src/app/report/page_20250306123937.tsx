"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, AlertCircle, Star, MapPin, Bus, Moon, Shield, Users, Home, Map, MessageCircle, Star as StarIcon, Info, Heart, PlayCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
const MapView = dynamic(() => import("@/components/map-view"), { 
  ssr: false,
  loading: () => (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-blue-100 shadow-inner bg-gray-50 animate-pulse" />
  )
});
import { ApifyListing, fetchLAListings, calculateSafetyScore, findSaferAlternatives, normalizeAirbnbUrl } from "@/lib/apify";
import SafetyInsights from "@/components/SafetyInsights";
import ReviewTakeaways from "@/components/ReviewTakeaways";
import LocationVideos from "@/components/LocationVideos";

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

    // TODO: Implement real safety metrics calculation using Overpass API
    // For now, return default values
    return {
      nightSafety: 0,
      publicTransport: 0,
      walkability: 0,
      overallSafety: 0
    };
  } catch (error) {
    console.error('Error calculating OSM safety metrics:', error);
    return {
      nightSafety: 0,
      publicTransport: 0,
      walkability: 0,
      overallSafety: 0
    };
  }
};

// Create a type for the section IDs to ensure type safety
type SectionId = keyof typeof sectionRefs;

// Navigation section constants with proper typing
const navigationSections = [
  { id: "overview" as SectionId, label: "Overview", icon: <Home className="h-4 w-4" /> },
  { id: "safety-metrics" as SectionId, label: "Safety Metrics", icon: <Shield className="h-4 w-4" /> },
  { id: "community" as SectionId, label: "Local Safety", icon: <Users className="h-4 w-4" /> },
  { id: "reviews" as SectionId, label: "Reviews", icon: <MessageCircle className="h-4 w-4" /> },
  { id: "videos" as SectionId, label: "Location Videos", icon: <PlayCircle className="h-4 w-4" /> },
  { id: "alternatives" as SectionId, label: "Alternatives", icon: <StarIcon className="h-4 w-4" /> }
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
  const [showReviews, setShowReviews] = useState(false);
  
  // Flag to track if data has been loaded to prevent reloading on scroll
  const hasDataLoaded = useRef(false);

  // Refs for each section
  const sectionRefs = {
    overview: useRef<HTMLDivElement>(null),
    location: useRef<HTMLDivElement>(null),
    "safety-metrics": useRef<HTMLDivElement>(null),
    community: useRef<HTMLDivElement>(null),
    reviews: useRef<HTMLDivElement>(null),
    videos: useRef<HTMLDivElement>(null),
    alternatives: useRef<HTMLDivElement>(null)
  };

  // Memoize components to prevent rerendering on scroll
  const MemoizedReviewTakeaways = useMemo(() => {
    if (!listing) return null;
    
    return (
      <ReviewTakeaways 
        reviews={listing.reviews?.details?.reviews.map(review => ({
          id: review.id,
          text: review.comments,
          date: review.createdAt,
          rating: review.rating,
          author: review.author.firstName,
          authorImage: `https://i.pravatar.cc/150?u=${review.id}`
        })) || []} 
        listingId={listing.id.toString()}
        isLoading={isLoading}
        showIndividualReviews={showReviews}
      />
    );
  }, [listing, isLoading, showReviews]);
  
  const MemoizedSafetyInsights = useMemo(() => {
    if (!listing || !showSafetyInsights) return null;
    
    return (
      <SafetyInsights
        latitude={listing.location.coordinates.lat}
        longitude={listing.location.coordinates.lng}
        radius={2}
      />
    );
  }, [listing, showSafetyInsights]);
  
  const MemoizedMapView = useMemo(() => {
    if (!listing || !listing.location.coordinates) return null;
    
    return (
      <MapView
        location={`${listing.location.city}, ${listing.location.state}`}
        safetyScore={safetyMetrics?.overallSafety || safetyScore}
        coordinates={[listing.location.coordinates.lng, listing.location.coordinates.lat]}
      />
    );
  }, [listing, safetyMetrics, safetyScore]);

  useEffect(() => {
    const checkAuth = async () => {
      // Only load data once to prevent reloads on scroll
      if (hasDataLoaded.current) return;
      
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

        // Log coordinates for map debugging
        console.log('Map coordinates:', {
          lat: matchingListing.location.coordinates.lat,
          lng: matchingListing.location.coordinates.lng,
          valid: typeof matchingListing.location.coordinates.lat === 'number' 
                && typeof matchingListing.location.coordinates.lng === 'number'
                && !isNaN(matchingListing.location.coordinates.lat)
                && !isNaN(matchingListing.location.coordinates.lng)
        });

        // Calculate safety metrics
        const score = calculateSafetyScore(matchingListing);
        
        // Get all reviews and add random avatar images
        const reviews = (matchingListing.reviews?.details?.reviews || []).map(review => ({
          id: review.id,
          text: review.comments,
          date: review.createdAt,
          rating: review.rating,
          author: review.author.firstName,
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
          console.log('Enabling safety insights with coordinates:', matchingListing.location.coordinates);
          setShowSafetyInsights(true);
        } else {
          console.log('Missing coordinates:', matchingListing.location);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error processing listing:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
      
      // Mark data as loaded to prevent reloading
      hasDataLoaded.current = true;
    };

    checkAuth();
  }, [url, router]);

  // Intersection Observer to detect which section is in view
  useEffect(() => {
    if (isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Process entries to find the most visible one
        let bestEntry = null;
        let highestRatio = 0;
        
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > highestRatio) {
            highestRatio = entry.intersectionRatio;
            bestEntry = entry;
          }
        }
        
        if (bestEntry) {
          const id = bestEntry.target.id;
          // Only update if changing to reduce rerenders
          setActiveSection(prevSection => prevSection !== id ? id : prevSection);
        }
      },
      { 
        rootMargin: "-100px 0px -100px 0px", 
        threshold: [0.1, 0.2, 0.3]
      }
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
  }, [isLoading]);

  // Memoize scroll behavior to prevent rerenders
  const scrollToSection = useCallback((sectionId: keyof typeof sectionRefs) => {
    const section = sectionRefs[sectionId];
    if (section.current) {
      window.scrollTo({
        top: section.current.offsetTop - 120,
        behavior: "smooth"
      });
    }
  }, [sectionRefs]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 py-8">
        <div className="container mx-auto px-4">
          
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
          <div className="overflow-x-auto">
            <nav className="flex space-x-1 pb-3">
              {navigationSections.map((section) => (
                <button
                  key={`nav-${section.id}`}
                  onClick={() => scrollToSection(section.id as keyof typeof sectionRefs)}
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
            {MemoizedMapView}
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
                      src={listing.photos?.[0]?.large}
                      alt={listing.title}
                      className="w-full object-cover"
                    />
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge className={`${getSafetyScoreColor(safetyMetrics?.overallSafety || safetyScore)} px-3 py-1.5 text-sm font-medium shadow-sm`}>
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
                  {MemoizedSafetyInsights}
                </CardContent>
              </Card>
            </div>

            {/* Reviews Section */}
            <div id="reviews" ref={sectionRefs.reviews}>
              <Card className="rounded-xl border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r">
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-blue-600" />
                    Reviews
                  </CardTitle>
                  <CardDescription>
                    What guests are saying about this property
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Review takeaways - Always visible */}
                  {MemoizedReviewTakeaways}

                  {/* Button to toggle individual reviews */}
                  <div className="flex justify-center mt-6">
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
                      onClick={() => setShowReviews(!showReviews)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {showReviews ? "Hide Reviews" : "See Individual Reviews"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Location Videos Section */}
            <div id="videos" ref={sectionRefs.videos}>
              <LocationVideos 
                locationId={listing.id.toString()}
                locationName={`${listing.location.city}, ${listing.location.state}`}
                isLoading={isLoading}
              />
            </div>

            {/* Alternatives Section */}
            <div id="alternatives" ref={sectionRefs.alternatives}>
              <Card className="rounded-xl border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r">
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <StarIcon className="h-5 w-5 text-blue-600" />
                    Safer Alternatives
                  </CardTitle>
                  <CardDescription>
                    Similar properties with better safety scores
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                              {alt.price?.amount ? `$${alt.price.amount}`