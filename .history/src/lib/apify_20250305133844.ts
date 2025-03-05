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
  location: {
    city: string;
    state: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  price: {
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
  let score = 70; // Base score

  // Adjust based on reviews
  const reviews = listing.reviews?.details?.reviews || [];
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1);
  
  if (avgRating >= 4.8) score += 15;
  else if (avgRating >= 4.5) score += 10;
  else if (avgRating >= 4.0) score += 5;
  
  // Adjust based on number of reviews
  if (reviews.length >= 100) score += 5;
  else if (reviews.length >= 50) score += 3;
  else if (reviews.length >= 20) score += 1;

  // Adjust based on superhost status
  if (listing.host.isSuperhost) score += 5;

  // Adjust based on safety-related amenities
  const safetyAmenities = [
    'security camera',
    'smoke alarm',
    'carbon monoxide alarm',
    'fire extinguisher',
    'first aid kit',
    'doorman',
    'lock on bedroom door',
  ];

  const hasSafetyAmenities = listing.amenities.some(amenity =>
    safetyAmenities.some(safetyAmenity =>
      amenity.toLowerCase().includes(safetyAmenity)
    )
  );

  if (hasSafetyAmenities) score += 5;

  // Ensure score stays within 0-100 range
  return Math.min(Math.max(score, 0), 100);
}

export function extractSafetyReviews(listing: ApifyListing) {
  const safetyKeywords = [
    'safe',
    'secure',
    'security',
    'unsafe',
    'dangerous',
    'sketchy',
    'neighborhood',
    'area',
    'location',
    'walk',
    'night',
    'quiet',
    'peaceful',
    'police',
    'crime',
    'light',
    'dark',
    'camera',
    'lock',
    'alarm',
    'parking'
  ];

  // Handle case where reviews or details might be undefined or not an array
  if (!listing.reviews?.details?.reviews || !Array.isArray(listing.reviews.details.reviews)) {
    return [];
  }

  return listing.reviews.details.reviews
    .filter(review =>
      safetyKeywords.some(keyword =>
        review.comments.toLowerCase().includes(keyword)
      )
    )
    .map(review => ({
      id: review.id,
      text: review.comments,
      date: review.createdAt,
      rating: review.rating,
      author: review.author.firstName
    }));
}

export function findSaferAlternatives(
  currentListing: ApifyListing,
  allListings: ApifyListing[],
  maxPriceDiff = 50,
  limit = 3
): ApifyListing[] {
  const currentPrice = currentListing.price.amount || 0;
  const currentSafetyScore = calculateSafetyScore(currentListing);
  const currentCity = currentListing.location.city;

  return allListings
    .filter(listing => {
      const listingPrice = listing.price.amount || 0;
      return (
        // Exclude current listing
        listing.id !== currentListing.id &&
        // Must be in same city
        listing.location.city.toLowerCase() === currentCity.toLowerCase() &&
        // Price within range (only if both prices are available)
        (currentPrice === 0 || listingPrice === 0 || Math.abs(listingPrice - currentPrice) <= maxPriceDiff) &&
        // Better safety score
        calculateSafetyScore(listing) > currentSafetyScore
      );
    })
    .sort((a, b) => calculateSafetyScore(b) - calculateSafetyScore(a))
    .slice(0, limit);
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