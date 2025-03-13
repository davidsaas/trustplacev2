"use client";

import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, AlertCircle, Star, MapPin, Bus, Moon, Users, Home, Map, MessageCircle, Star as StarIcon, Info, Heart, PlayCircle, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/providers/auth-provider";
// Prevent map blinking with persistent instance across renders
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
import SafetyMetrics from "@/components/SafetyMetrics";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';


// Navigation sections for the sticky menu
const navigationSections = [
  { id: "overview", label: "Overview", icon: <Home className="h-4 w-4" /> },
  { id: "safety", label: "Safety Metrics", icon: <Shield className="h-4 w-4" /> },
  { id: "community", label: "Safety Insights", icon: <Users className="h-4 w-4" /> },
  { id: "reviews", label: "Reviews", icon: <MessageCircle className="h-4 w-4" /> },
  { id: "videos", label: "Location Videos", icon: <PlayCircle className="h-4 w-4" /> },
  { id: "alternatives", label: "Alternatives", icon: <StarIcon className="h-4 w-4" /> }
];

// Component that uses useSearchParams
function ReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, ready } = useAuth();
  const url = searchParams?.get("url");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<ApifyListing | null>(null);
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
  const [isSaved, setIsSaved] = useState(false);
  const [heartAnimation, setHeartAnimation] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [showSafetyInsights, setShowSafetyInsights] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [overallSafetyScore, setOverallSafetyScore] = useState<number>(0);

  // Refs for each section
  const sectionRefs = {
    overview: useRef<HTMLDivElement>(null),
    location: useRef<HTMLDivElement>(null),
    safety: useRef<HTMLDivElement>(null),
    community: useRef<HTMLDivElement>(null),
    reviews: useRef<HTMLDivElement>(null),
    videos: useRef<HTMLDivElement>(null),
    alternatives: useRef<HTMLDivElement>(null)
  };

  // Function to handle navigation to a new listing
  const navigateToListing = (url: string) => {
    setIsLoading(true); // Show loading state immediately
    router.push(`/report?url=${encodeURIComponent(url)}`);
  };

  // Memoize the map component to prevent flickering on scroll
  const mobileMapComponent = useMemo(() => {
    if (!listing || !listing.location.coordinates) return null;
    return (
      <MapView
        mainLocation={{
          location: `${listing.location.city}, ${listing.location.state}`,
          safetyScore: calculateSafetyScore(listing),
          coordinates: [listing.location.coordinates.lng, listing.location.coordinates.lat],
          url: listing.url
        }}
        alternativeLocations={alternatives.map(alt => ({
          location: `${alt.location.city}, ${alt.location.state}`,
          safetyScore: calculateSafetyScore(alt),
          coordinates: [alt.location.coordinates.lng, alt.location.coordinates.lat],
          url: alt.url
        }))}
        onLocationClick={navigateToListing}
      />
    );
  }, [listing, alternatives]);

  // Memoize the desktop map component to prevent flickering on scroll
  const desktopMapComponent = useMemo(() => {
    if (!listing || !listing.location.coordinates) return null;
    return (
      <MapView
        mainLocation={{
          location: `${listing.location.city}, ${listing.location.state}`,
          safetyScore: calculateSafetyScore(listing),
          coordinates: [listing.location.coordinates.lng, listing.location.coordinates.lat],
          url: listing.url
        }}
        alternativeLocations={alternatives.map(alt => ({
          location: `${alt.location.city}, ${alt.location.state}`,
          safetyScore: calculateSafetyScore(alt),
          coordinates: [alt.location.coordinates.lng, alt.location.coordinates.lat],
          url: alt.url
        }))}
        onLocationClick={navigateToListing}
      />
    );
  }, [listing, alternatives]);

  // Wait for auth to be ready before initializing
  useEffect(() => {
    if (!ready) return;
    
    const initializeReport = async () => {
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
          setError('We could not find this Airbnb listing in our database. Please make sure you have pasted a valid Los Angeles Airbnb URL.');
          setIsLoading(false);
          return;
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
        
        // Log photo structure if present
        console.log('Photos structure:', matchingListing.photos);
        
        // Log price data for debugging
        console.log('Price data:', {
          hasPrice: !!matchingListing.price?.amount,
          priceAmount: matchingListing.price?.amount,
          fullPriceObj: matchingListing.price
        });

        
        // Get all reviews and add random avatar images
        const reviews = (matchingListing.reviews?.details?.reviews || []).map(review => ({
          id: review.id,
          text: review.comments,
          date: review.createdAt,
          rating: review.rating,
          author: review.author.firstName,
        }));
        
        const saferOptions = findSaferAlternatives(matchingListing, listings);
      
        console.log('Safety reviews:', JSON.stringify(reviews, null, 2));
        console.log('Safer alternatives:', JSON.stringify(saferOptions, null, 2));

        setListing(matchingListing);
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
        setIsLoading(false);
      }
    };

    initializeReport();
  }, [url, router, ready]);


  // Intersection Observer to detect which section is in view
  useEffect(() => {
    if (isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            // Only update active section state if it's actually changed
            // to prevent unnecessary rerenders
            setActiveSection((prevSection) => {
              if (prevSection !== id) return id;
              return prevSection;
            });
          }
        });
      },
      { rootMargin: "-100px 0px -80% 0px", threshold: 0.1 } // Adjusted for more stability
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

  // Check if report is already saved when loading
  useEffect(() => {
    const checkIfReportSaved = async () => {
      if (!url) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;
        
        const { data, error } = await supabase
          .from('saved_reports')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('listing_url', url)
          .limit(1);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setIsSaved(true);
        }
      } catch (err) {
        console.error("Error checking if report is saved:", err);
      }
    };
    
    checkIfReportSaved();
  }, [url]);

  // Updated to handle both save and unsave actions
  const handleSaveReport = async () => {
    if (!listing) return;
    
    try {
      setSaving(true);
      setHeartAnimation(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError("You must be logged in to save reports");
        setSaving(false);
        setHeartAnimation(false);
        toast.error("You must be logged in to save reports");
        return;
      }
      
      // Check if report is already saved
      const { data: existingReport, error: checkError } = await supabase
        .from('saved_reports')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('listing_url', url || '')
        .limit(1);
        
      if (checkError) throw checkError;
      
      if (existingReport && existingReport.length > 0) {
        // Report is already saved, so unsave it
        const { error: deleteError } = await supabase
          .from('saved_reports')
          .delete()
          .eq('id', existingReport[0].id);
          
        if (deleteError) throw deleteError;
        
        setIsSaved(false);
        toast.success("Report removed from saved items");
      } else {
        // Report is not saved, so save it
        const { error } = await supabase
          .from('saved_reports')
          .insert({
            user_id: session.user.id,
            listing_url: url || '',
            listing_title: listing.title,
            safety_score: calculateSafetyScore(listing),
          });
          
        if (error) throw error;
        
        setIsSaved(true);
        toast.success("Report saved successfully!");
      }
      
      // Stop animation after a short delay
      setTimeout(() => setHeartAnimation(false), 1000);
    } catch (err) {
      console.error("Error toggling save status:", err);
      setError("Failed to update saved status. Please try again.");
      toast.error("Failed to update saved status. Please try again.");
      setHeartAnimation(false);
    } finally {
      setSaving(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs[sectionId as keyof typeof sectionRefs]?.current;
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  /* Add useEffect for debugging alternatives pricing */
  useEffect(() => {
    if (alternatives.length > 0) {
      console.log('Alternatives with prices:', alternatives.slice(0, 3).map(alt => ({
        id: alt.id,
        title: alt.title,
        hasPrice: !!alt.price?.amount,
        priceAmount: alt.price?.amount
      })));
    }
  }, [alternatives]);

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
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
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  return (
    <div className="min-h-screen pb-12">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          {/* Alert component has been removed, using toast notifications instead */}
        </div>
      </div>

      {/* Horizontal Sticky Navigation Menu - Full Width */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm mb-6">
        <div className="container mx-auto">
          <div className="overflow-x-auto hide-scrollbar">
            <nav className="flex items-center h-16 gap-1">
              {navigationSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`
                    flex items-center gap-2 px-4 h-full text-sm font-medium transition-all
                    ${activeSection === section.id
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                    }
                  `}
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
            {mobileMapComponent}
          </div>
        </div>

        {/* Desktop: 40% Content, 60% Map */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Content - 40% width on desktop */}
          <div className="w-full md:w-[40%] space-y-6">
            {/* Overview Section */}
            <div id="overview" ref={sectionRefs.overview}>
              <Card className="overflow-hidden rounded-xl border-0 shadow-lg">
                <div className="relative">
                  <div className="h-72 overflow-hidden">
                    <img
                      src={listing.photos?.[0]?.large}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                      <h2 className="text-2xl font-semibold text-white mb-3">{listing.title}</h2>
                      <p className="flex items-center gap-2 text-white/90 text-sm">
                        <MapPin className="h-4 w-4" />
                        {listing.location.city}, {listing.location.state}
                      </p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-2xl font-semibold text-gray-900">
                        {listing.price?.amount ? `$${listing.price.amount}` : 'Price not available'} 
                        <span className="text-sm font-normal text-gray-500 ml-1">per night</span>
                      </p>
                    </div>
                    <Button 
                      onClick={handleSaveReport}
                      disabled={saving}
                      variant="ghost"
                      size="icon"
                      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all
                        ${saving ? 'opacity-70' : ''} 
                        ${isSaved ? 'hover:bg-red-50' : 'hover:bg-gray-100'}`}
                      aria-label={isSaved ? "Remove from saved" : "Save report"}
                    >
                      <Heart 
                        className={`h-5 w-5 transition-all 
                          ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'} 
                          ${heartAnimation ? 'animate-heartbeat' : ''}`} 
                      />
                    </Button>
                  </div>
                  
                  <div className="flex items-stretch gap-6 p-6 bg-gray-50 rounded-2xl">
                    {overallSafetyScore > 0 ? (
                      <>
                        <div className="w-28 h-28">
                          <CircularProgressbar
                            value={overallSafetyScore}
                            text={`${overallSafetyScore}`}
                            styles={buildStyles({
                              textSize: '28px',
                              pathColor: overallSafetyScore >= 80 ? '#22c55e' : 
                                        overallSafetyScore >= 60 ? '#3b82f6' : 
                                        overallSafetyScore >= 40 ? '#eab308' : '#ef4444',
                              textColor: '#1f2937',
                              trailColor: '#e5e7eb',
                              pathTransitionDuration: 0.5,
                            })}
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Safety Score</h3>
                          <p className="text-sm text-gray-600 mb-3">
                            Based on official crime data, local insights, and community feedback
                          </p>
                          <Badge variant="outline" className={
                            overallSafetyScore >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                            overallSafetyScore >= 60 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            overallSafetyScore >= 40 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }>
                            {overallSafetyScore >= 80 ? 'Very Safe' :
                             overallSafetyScore >= 60 ? 'Safe' :
                             overallSafetyScore >= 40 ? 'Moderate' : 'Exercise Caution'}
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <div className="w-full text-center py-4">
                        <Shield className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">Safety score not yet available for this location.</p>
                        <p className="text-sm text-gray-500 mt-1">We're gathering data to provide accurate safety insights.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Safety Metrics Section */}
            <div id="safety" ref={sectionRefs.safety}>
              <SafetyMetrics 
                latitude={listing.location.coordinates.lat} 
                longitude={listing.location.coordinates.lng}
                city={listing.location.city}
                onOverallScoreCalculated={setOverallSafetyScore}
              />
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
              <Card className="rounded-xl border-0 shadow-lg overflow-hidden">
                <CardHeader className="border-b border-gray-100 bg-white/50 backdrop-blur-sm p-6">
                  <div className="flex items-center gap-2 mb-1.5">
                    <MessageCircle className="h-5 w-5 text-gray-900" />
                    <CardTitle className="text-gray-900">Guest Reviews</CardTitle>
                  </div>
                  <CardDescription className="text-gray-500">
                    Safety insights from verified guest reviews
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Review takeaways - Always visible */}
                  <ReviewTakeaways 
                    reviews={listing.reviews?.details?.reviews.map(review => ({
                      id: review.id,
                      text: review.comments,
                      date: review.createdAt,
                      rating: review.rating,
                      author: review.author.firstName
                    })) || []} 
                    listingId={listing.id.toString()}
                    isLoading={isLoading}
                    showIndividualReviews={showReviews}
                  />

                  {/* Button to toggle individual reviews */}
                  <div className="flex justify-center mt-8">
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-gray-200"
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
              <Card className="rounded-xl border-0 shadow-lg overflow-hidden">
                <CardHeader className="border-b border-gray-100 bg-white/50 backdrop-blur-sm p-6">
                  <div className="flex items-center gap-2 mb-1.5">
                    <PlayCircle className="h-5 w-5 text-gray-900" />
                    <CardTitle className="text-gray-900">Location Videos</CardTitle>
                  </div>
                  <CardDescription className="text-gray-500">
                    Watch community videos about safety in this area
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <LocationVideos 
                    locationId={listing.id.toString()}
                    locationName={`${listing.location.city}, ${listing.location.state}`}
                    isLoading={isLoading}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Alternatives Section */}
            <div id="alternatives" ref={sectionRefs.alternatives}>
              <Card className="rounded-xl border-0 shadow-lg overflow-hidden">
                <CardHeader className="border-b border-gray-100 bg-white/50 backdrop-blur-sm p-6">
                  <div className="flex items-center gap-2 mb-1.5">
                    <StarIcon className="h-5 w-5 text-gray-900" />
                    <CardTitle className="text-gray-900">Safer Alternatives</CardTitle>
                  </div>
                  <CardDescription className="text-gray-500">
                    Similar properties with better safety scores
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 gap-4">
                    {alternatives.slice(0, 3).map((alt) => (
                      <div 
                        key={alt.id} 
                        className="group bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer" 
                        onClick={() => navigateToListing(alt.url)}
                      >
                        <div className="flex">
                          <div className="w-1/3 relative">
                            <img 
                              src={alt.photos?.[0]?.large || "/images/placeholder-home.jpg"} 
                              alt={alt.title}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          </div>
                          <div className="w-2/3 p-4">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <h4 className="font-medium text-gray-900 line-clamp-1 group-hover:text-gray-700 transition-colors">
                                  {alt.title}
                                </h4>
                                <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {alt.location.city}, {alt.location.state}
                                </p>
                                <p className="text-sm font-medium text-gray-900 mt-2">
                                  {alt.price?.amount ? `$${alt.price.amount}` : 'Price not available'}
                                  <span className="text-gray-500 font-normal"> per night</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Map - 60% width on desktop */}
          <div className="hidden md:block w-full md:w-[60%]">
            <div className="sticky top-24 h-[calc(100vh-6rem)] rounded-xl overflow-hidden shadow-md">
              {desktopMapComponent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback
function ReportFallback() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="p-4 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<ReportFallback />}>
      <ReportContent />
    </Suspense>
  );
}