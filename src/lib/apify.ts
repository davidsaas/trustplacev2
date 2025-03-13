export interface ApifyReview {
  id: string;
  comments: string;
  createdAt: string;
  rating: number;
  author: {
    firstName: string;
    id: string;
  };
}

export interface ApifyListing {
  id: string | number;
  title: string;
  url: string;
  type?: 'airbnb' | 'booking';
  location: {
    city: string;
    state: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  pricing?: {
    rate?: {
      amount?: number;
      currency?: string;
    };
  };
  price?: {
    amount?: number;
    currency: string;
  };
  photos: Array<{
    caption: string;
    id: number;
    large: string;
    previewEncodedPng: string;
    scrimColor: string;
    isProfessional: boolean;
    pictureOrientation: string;
    aspectRatio: number;
  }>;
  description: string;
  host: {
    name?: string;
    id?: string;
    isSuperhost?: boolean;
  };
  amenities: string[];
  reviews: {
    details: {
      reviews: ApifyReview[];
    };
  };
  lastUpdated: string;
}

export interface ApifyResponse {
  success: boolean;
  data?: ApifyListing[];
  error?: string;
}

export async function fetchLAListings(): Promise<ApifyResponse> {
  try {
    const response = await fetch('/api/listings');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching LA listings:', error);
    return {
      success: false,
      error: 'Failed to fetch listings',
    };
  }
}

export function calculateSafetyScore(listing: ApifyListing): number {
  let score = 0;
  const maxScore = 100;

  // Reviews score (max 40 points)
  const reviews = listing.reviews?.details?.reviews || [];
  if (reviews.length > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    score += Math.round((avgRating / 5) * 40); // Convert 5-star rating to 40-point scale
  }

  // Review quantity score (max 20 points)
  const reviewCountScore = Math.min(reviews.length / 100 * 20, 20); // 100+ reviews = full points
  score += reviewCountScore;

  // Superhost status (20 points)
  if (listing.type === 'airbnb' && listing.host?.isSuperhost) {
    score += 20;
  }

  // Safety amenities score (max 20 points)
  const safetyAmenities = [
    'security camera',
    'smoke alarm',
    'carbon monoxide alarm',
    'fire extinguisher',
    'first aid kit',
    'doorman',
    'lock on bedroom door',
  ];

  const amenityScore = safetyAmenities.reduce((sum, amenity) => {
    const listingAmenities = listing.amenities || [];
    return sum + (listingAmenities.some(a => 
      a.toLowerCase().includes(amenity)
    ) ? (20 / safetyAmenities.length) : 0);
  }, 0);

  score += Math.round(amenityScore);

  // Ensure score stays within 0-100 range
  return Math.min(Math.max(Math.round(score), 0), maxScore);
}

export function getSafetyRiskCategory(safetyScore: number): 'Very Low Risk' | 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Very High Risk' {
  if (safetyScore >= 80) return 'Very Low Risk';
  if (safetyScore >= 60) return 'Low Risk';
  if (safetyScore >= 40) return 'Moderate Risk';
  if (safetyScore >= 20) return 'High Risk';
  return 'Very High Risk';
}

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper function to determine accommodation type from title and description
function getAccommodationType(listing: ApifyListing): string {
  const title = listing.title?.toLowerCase() || '';
  const description = listing.description?.toLowerCase() || '';
  const text = `${title} ${description}`;
  
  if (text.includes('entire home') || text.includes('house')) return 'house';
  if (text.includes('apartment') || text.includes('condo')) return 'apartment';
  if (text.includes('private room')) return 'private room';
  if (text.includes('shared room')) return 'shared room';
  if (text.includes('studio')) return 'studio';
  return 'other';
}

export interface SaferAlternative extends ApifyListing {
  distanceKm: number;
  safetyScoreDiff: number;
  priceMatch: number; // percentage match (0-100)
  typeMatch: boolean;
}

export function findSaferAlternatives(
  currentListing: ApifyListing,
  allListings: ApifyListing[],
  options = {
    maxDistanceKm: 5,
    minSafetyScoreDiff: 5,
    priceRangePercent: 20,
    limit: 5
  }
): SaferAlternative[] {
  const currentPrice = currentListing.price?.amount || currentListing.pricing?.rate?.amount || 0;
  const currentSafetyScore = calculateSafetyScore(currentListing);
  const currentType = getAccommodationType(currentListing);
  const currentCoords = currentListing.location.coordinates;

  // Early return if no valid coordinates
  if (!currentCoords?.lat || !currentCoords?.lng) {
    console.warn('Current listing missing coordinates');
    return [];
  }

  // Calculate price range
  const minPrice = currentPrice * (1 - options.priceRangePercent / 100);
  const maxPrice = currentPrice * (1 + options.priceRangePercent / 100);

  const alternatives = allListings
    .filter(listing => {
      // Skip if same listing
      if (listing.id === currentListing.id) return false;

      // Skip if no coordinates
      if (!listing.location.coordinates?.lat || !listing.location.coordinates?.lng) return false;

      // Calculate key metrics
      const distance = calculateDistance(
        currentCoords.lat,
        currentCoords.lng,
        listing.location.coordinates.lat,
        listing.location.coordinates.lng
      );

      // Skip if too far
      if (distance > options.maxDistanceKm) return false;

      const safetyScore = calculateSafetyScore(listing);
      const safetyScoreDiff = safetyScore - currentSafetyScore;

      // Must have better safety score
      if (safetyScoreDiff < options.minSafetyScoreDiff) return false;

      // Check price range if price available
      const listingPrice = listing.price?.amount || listing.pricing?.rate?.amount || 0;
      if (currentPrice > 0 && listingPrice > 0) {
        if (listingPrice < minPrice || listingPrice > maxPrice) return false;
      }

      return true;
    })
    .map(listing => {
      const listingPrice = listing.price?.amount || listing.pricing?.rate?.amount || 0;
      const distance = calculateDistance(
        currentCoords.lat,
        currentCoords.lng,
        listing.location.coordinates.lat,
        listing.location.coordinates.lng
      );
      
      // Calculate price match percentage
      let priceMatch = 100;
      if (currentPrice > 0 && listingPrice > 0) {
        const priceDiff = Math.abs(currentPrice - listingPrice);
        priceMatch = Math.max(0, 100 - (priceDiff / currentPrice * 100));
      }

      return {
        ...listing,
        distanceKm: Number(distance.toFixed(1)),
        safetyScoreDiff: calculateSafetyScore(listing) - currentSafetyScore,
        priceMatch: Math.round(priceMatch),
        typeMatch: getAccommodationType(listing) === currentType
      };
    })
    .sort((a, b) => {
      // Primary sort by safety score difference
      const safetyDiff = b.safetyScoreDiff - a.safetyScoreDiff;
      if (Math.abs(safetyDiff) > 5) return safetyDiff;
      
      // Secondary sort by price match if safety scores are close
      const priceMatchDiff = b.priceMatch - a.priceMatch;
      if (Math.abs(priceMatchDiff) > 10) return priceMatchDiff;
      
      // Finally sort by distance if other factors are similar
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, options.limit);

  return alternatives;
}

export function normalizeAirbnbUrl(url: string): string {
  try {
    // Remove any query parameters and trailing slashes
    const cleanUrl = url.split('?')[0].replace(/\/$/, '');
    
    // Extract the room ID
    const roomIdMatch = cleanUrl.match(/\/rooms\/(\d+)/);
    if (!roomIdMatch) return url; // Return original if no match
    
    // Return normalized format
    return `https://www.airbnb.com/rooms/${roomIdMatch[1]}`;
  } catch {
    return url;
  }
} 