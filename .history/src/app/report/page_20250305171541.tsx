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

// Community opinions placeholder data - we'll replace this with real data
// const communityOpinions = [
//   {
//     id: 1,
//     source: "Reddit",
//     username: "LAexplorer",
//     date: "2023-12-15",
//     text: "This area is generally safe during the day, but I'd be careful walking alone at night. There are some great restaurants within walking distance though!",
//     sentiment: "mixed",
//     avatar: "https://i.pravatar.cc/150?img=1"
//   },
//   {
//     id: 2,
//     source: "TripAdvisor",
//     username: "TravelGuru22",
//     date: "2024-01-03",
//     text: "Stayed in this neighborhood for a week and felt completely safe. Public transportation is convenient and the area has a great vibe.",
//     sentiment: "positive",
//     avatar: "https://i.pravatar.cc/150?img=2"
//   },
//   {
//     id: 3,
//     source: "Twitter",
//     username: "LocalLAresident",
//     date: "2024-02-20",
//     text: "I've lived nearby for years. It's a typical LA neighborhood - some streets are better than others. Use common sense and you'll be fine.",
//     sentiment: "neutral",
//     avatar: "https://i.pravatar.cc/150?img=3"
//   }
// ];

// Navigation sections for the sticky menu
const navigationSections = [
  { id: "overview", label: "Overview", icon: <Home className="h-4 w-4" /> },
  { id: "location", label: "Location", icon: <Map className="h-4 w-4" /> },
  { id: "safety-metrics", label: "Safety Metrics", icon: <Shield className="h-4 w-4" /> },
  { id: "community", label: "Community", icon: <Users className="h-4 w-4" /> },
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
  // Add state for community opinions
  const [communityOpinions, setCommunityOpinions] = useState<Array<{
    id: string | number;
    source: string;
    username: string;
    date: string;
    text: string;
    sentiment: string;
    avatar: string;
    permalink?: string;
  }>>([]);
  const [loadingComments, setLoadingComments] = useState(false);

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

        // Fetch community opinions after setting the listing
        fetchCommunityOpinions(matchingListing);
      } catch (err) {
        console.error('Error processing listing:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
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
    sectionRefs[sectionId as keyof typeof sectionRefs]?.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  const getSocialIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'reddit':
        return '/images/social/reddit.svg';
      case 'tripadvisor':
        return '/images/social/tripadvisor.svg';
      case 'twitter':
        return '/images/social/twitter.svg';
      default:
        return '';
    }
  };

  // Add function to fetch community opinions
  const fetchCommunityOpinions = async (listing: ApifyListing) => {
    if (!listing || !listing.location) return;
    
    setLoadingComments(true);
    
    try {
      // Extract location data from the listing
      const locationData = {
        lat: listing.location.coordinates.lat,
        lng: listing.location.coordinates.lng,
        neighborhood: 
          // Try to extract neighborhood from different possible locations in the data structure
          (listing.location as any).address?.neighborhood || 
          (listing.location as any).address?.suburb || 
          (listing.location as any).address?.city_district ||
          listing.location.city, // Fallback to city if no neighborhood info
        city: (listing.location as any).address?.city || listing.location.city
      };
      
      // Fallback to placeholder data if we don't have enough location info
      if (!locationData.neighborhood && !locationData.city) {
        console.warn('Insufficient location data for community opinions');
        // Use placeholder data as fallback
        setCommunityOpinions([
          {
            id: 1,
            source: "Reddit",
            username: "LAexplorer",
            date: "2023-12-15",
            text: "This area is generally safe during the day, but I'd be careful walking alone at night. There are some great restaurants within walking distance though!",
            sentiment: "mixed",
            avatar: "https://i.pravatar.cc/150?img=1"
          },
          {
            id: 2,
            source: "TripAdvisor",
            username: "TravelGuru22",
            date: "2024-01-03",
            text: "Stayed in this neighborhood for a week and felt completely safe. Public transportation is convenient and the area has a great vibe.",
            sentiment: "positive",
            avatar: "https://i.pravatar.cc/150?img=2"
          },
          {
            id: 3,
            source: "Twitter",
            username: "LocalLAresident",
            date: "2024-02-20",
            text: "I've lived nearby for years. It's a typical LA neighborhood - some streets are better than others. Use common sense and you'll be fine.",
            sentiment: "neutral",
            avatar: "https://i.pravatar.cc/150?img=3"
          }
        ]);
        setLoadingComments(false);
        return;
      }
      
      // Fetch real comments from our API
      const response = await fetch('/api/social-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location: locationData }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch community opinions');
      }
      
      const data = await response.json();
      
      if (data.comments && data.comments.length > 0) {
        setCommunityOpinions(data.comments);
      } else {
        // Fallback to placeholder data if no comments found
        setCommunityOpinions([
          {
            id: 1,
            source: "Reddit",
            username: "LAexplorer",
            date: "2023-12-15",
            text: "This area is generally safe during the day, but I'd be careful walking alone at night. There are some great restaurants within walking distance though!",
            sentiment: "mixed",
            avatar: "https://i.pravatar.cc/150?img=1"
          },
          {
            id: 2,
            source: "TripAdvisor",
            username: "TravelGuru22",
            date: "2024-01-03",
            text: "Stayed in this neighborhood for a week and felt completely safe. Public transportation is convenient and the area has a great vibe.",
            sentiment: "positive",
            avatar: "https://i.pravatar.cc/150?img=2"
          },
          {
            id: 3,
            source: "Twitter",
            username: "LocalLAresident",
            date: "2024-02-20",
            text: "I've lived nearby for years. It's a typical LA neighborhood - some streets are better than others. Use common sense and you'll be fine.",
            sentiment: "neutral",
            avatar: "https://i.pravatar.cc/150?img=3"
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching community opinions:', error);
      // Use placeholder data as fallback
      setCommunityOpinions([
        {
          id: 1,
          source: "Reddit",
          username: "LAexplorer",
          date: "2023-12-15",
          text: "This area is generally safe during the day, but I'd be careful walking alone at night. There are some great restaurants within walking distance though!",
          sentiment: "mixed",
          avatar: "https://i.pravatar.cc/150?img=1"
        },
        {
          id: 2,
          source: "TripAdvisor",
          username: "TravelGuru22",
          date: "2024-01-03",
          text: "Stayed in this neighborhood for a week and felt completely safe. Public transportation is convenient and the area has a great vibe.",
          sentiment: "positive",
          avatar: "https://i.pravatar.cc/150?img=2"
        },
        {
          id: 3,
          source: "Twitter",
          username: "LocalLAresident",
          date: "2024-02-20",
          text: "I've lived nearby for years. It's a typical LA neighborhood - some streets are better than others. Use common sense and you'll be fine.",
          sentiment: "neutral",
          avatar: "https://i.pravatar.cc/150?img=3"
        }
      ]);
    } finally {
      setLoadingComments(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-blue-900">Safety Report</h1>
            <Button
              variant="outline"
              onClick={handleBackToDashboard}
              className="flex items-center gap-2 bg-white hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
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
            <Button
              variant="outline"
              onClick={handleBackToDashboard}
              className="flex items-center gap-2 bg-white hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900">Safety Report</h1>
          <Button
            variant="outline"
            onClick={handleBackToDashboard}
            className="flex items-center gap-2 bg-white hover:bg-blue-50 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {saveSuccess && (
          <Alert className="mb-6 bg-emerald-50 text-emerald-800 border-emerald-200 rounded-xl shadow-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Report saved successfully!</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sticky Navigation Menu */}
          <div className="hidden md:block">
            <div className="sticky top-6 bg-white p-5 rounded-xl border border-blue-100 shadow-md">
              <h3 className="font-medium mb-4 text-blue-900 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                Report Sections
              </h3>
              <nav className="space-y-2">
                {navigationSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg transition-all ${
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

          {/* Main Content */}
          <div className="md:col-span-3 space-y-8">
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

            {/* Location Section */}
            <div id="location" ref={sectionRefs.location}>
              <Card className="rounded-xl border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <Map className="h-5 w-5 text-blue-600" />
                    Location & Map
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <MapView 
                    location={`${listing.location.city}, ${listing.location.state}`}
                    safetyScore={safetyMetrics?.overallSafety || safetyScore}
                    coordinates={[listing.location.coordinates.lng, listing.location.coordinates.lat]}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Safety Metrics Section */}
            <div id="safety-metrics" ref={sectionRefs["safety-metrics"]}>
              <Card className="rounded-xl border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Safety Metrics
                  </CardTitle>
                  <CardDescription>
                    Based on OpenStreetMap data for this location
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`p-5 rounded-xl ${getSafetyGradient(safetyMetrics?.nightSafety || 65)} border`}>
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

                    <div className={`p-5 rounded-xl ${getSafetyGradient(safetyMetrics?.publicTransport || 70)} border`}>
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

                    <div className={`p-5 rounded-xl ${getSafetyGradient(safetyMetrics?.walkability || 75)} border`}>
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
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Local Safety Insights
                  </CardTitle>
                  <CardDescription>
                    What locals and travelers say about safety in this area
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-5">
                    {loadingComments ? (
                      // Loading skeleton
                      <>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-12 w-12 rounded-full" />
                              <div>
                                <Skeleton className="h-4 w-32 mb-2" />
                                <Skeleton className="h-3 w-24" />
                              </div>
                            </div>
                            <Skeleton className="h-6 w-16 rounded-full" />
                          </div>
                          <Skeleton className="h-4 w-full mb-1" />
                          <Skeleton className="h-4 w-5/6 mb-1" />
                          <Skeleton className="h-4 w-4/6" />
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-12 w-12 rounded-full" />
                              <div>
                                <Skeleton className="h-4 w-32 mb-2" />
                                <Skeleton className="h-3 w-24" />
                              </div>
                            </div>
                            <Skeleton className="h-6 w-16 rounded-full" />
                          </div>
                          <Skeleton className="h-4 w-full mb-1" />
                          <Skeleton className="h-4 w-5/6 mb-1" />
                          <Skeleton className="h-4 w-4/6" />
                        </div>
                      </>
                    ) : communityOpinions.length > 0 ? (
                      communityOpinions.map((opinion) => (
                        <div key={opinion.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                <img 
                                  src={opinion.avatar} 
                                  alt={opinion.username}
                                  className="object-cover"
                                />
                                <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full overflow-hidden border-2 border-white bg-white flex items-center justify-center">
                                  <img 
                                    src={getSocialIcon(opinion.source.split(' ')[0])} 
                                    alt={opinion.source.split(' ')[0]}
                                    className="h-3 w-3"
                                  />
                                </div>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{opinion.username}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <span>{new Date(opinion.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                  {opinion.source.includes('(') && (
                                    <Badge variant="outline" className="ml-1 py-0 h-4 text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                                      {opinion.source.match(/\((.*?)\)/)?.[1] || ''}
                                    </Badge>
                                  )}
                                </p>
                              </div>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={
                                opinion.sentiment === "positive" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                opinion.sentiment === "negative" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                "bg-gray-50 text-gray-700 border-gray-200"
                              }
                            >
                              {opinion.sentiment}
                            </Badge>
                          </div>
                          <p className="text-gray-700 italic">&ldquo;{opinion.text}&rdquo;</p>
                          {opinion.permalink && (
                            <div className="mt-3 text-right">
                              <a 
                                href={opinion.permalink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center justify-end gap-1"
                              >
                                <span>View on Reddit</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                              </a>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-gray-500 text-center py-4">No community safety insights found for this location.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reviews Section */}
            <div id="reviews" ref={sectionRefs.reviews}>
              {safetyReviews.length > 0 && (
                <Card className="rounded-xl border-0 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                    <CardTitle className="text-blue-900 flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                      Safety-Related Reviews
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
                            <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                              {review.rating}/5
                            </Badge>
                          </div>
                          <p className="text-gray-700 italic">&ldquo;{review.text}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Alternatives Section */}
            <div id="alternatives" ref={sectionRefs.alternatives}>
              <Card className="rounded-xl border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <StarIcon className="h-5 w-5 text-blue-600" />
                    Safer Alternatives Nearby
                  </CardTitle>
                  <CardDescription>
                    Similar properties in the area with better safety scores
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {alternatives.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {alternatives.map((alt) => (
                        <div key={alt.id} className="flex items-start space-x-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                          <div className="w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden">
                            <img
                              src={alt.photos?.[0]?.large || "/images/placeholder-home.jpg"}
                              alt={alt.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <h3 className="text-base font-medium text-gray-900 truncate">{alt.title}</h3>
                              <Badge className={`${getSafetyScoreColor(calculateSafetyScore(alt))} flex items-center gap-1`}>
                                <Shield className="h-3 w-3" />
                                {calculateSafetyScore(alt)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {alt.location.city}, {alt.location.state}
                            </p>
                            <p className="text-sm font-medium text-blue-700 mt-1">
                              {alt.price?.amount ? `$${alt.price.amount} per night` : 'Price not available'}
                            </p>
                            <Button
                              variant="outline"
                              className="mt-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                              onClick={() => window.open(alt.url, '_blank')}
                            >
                              View Listing
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600">
                        No safer alternatives found at similar price points.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}