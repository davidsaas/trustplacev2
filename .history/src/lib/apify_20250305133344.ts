export interface ApifyListing {
  id: string;
  title: string;
  url: string;
  location: {
    neighborhood: string;
    city: string;
    state: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  price: {
    amount: number;
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
    name: string;
    id: string;
    isSuperhost: boolean;
  };
  amenities: string[];
  reviews: {
    rating: number;
    count: number;
    details: Array<{
      id: string;
      text: string;
      date: string;
      rating: number;
      author: string;
    }>;
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
  if (listing.reviews.rating >= 4.8) score += 15;
  else if (listing.reviews.rating >= 4.5) score += 10;
  else if (listing.reviews.rating >= 4.0) score += 5;
  
  // Adjust based on number of reviews
  if (listing.reviews.count >= 100) score += 5;
  else if (listing.reviews.count >= 50) score += 3;
  else if (listing.reviews.count >= 20) score += 1;

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
  ];

  // Handle case where reviews or details might be undefined or not an array
  if (!listing.reviews?.details || !Array.isArray(listing.reviews.details)) {
    return [];
  }

  return listing.reviews.details.filter(review =>
    safetyKeywords.some(keyword =>
      review.text.toLowerCase().includes(keyword)
    )
  );
}

export function findSaferAlternatives(
  currentListing: ApifyListing,
  allListings: ApifyListing[],
  maxPriceDiff = 50,
  limit = 3
): ApifyListing[] {
  const currentPrice = currentListing.price.amount;
  const currentSafetyScore = calculateSafetyScore(currentListing);
  const currentCity = currentListing.location.city;

  return allListings
    .filter(listing => 
      // Exclude current listing
      listing.id !== currentListing.id &&
      // Must be in same city
      listing.location.city.toLowerCase() === currentCity.toLowerCase() &&
      // Price within range
      Math.abs(listing.price.amount - currentPrice) <= maxPriceDiff &&
      // Better safety score
      calculateSafetyScore(listing) > currentSafetyScore
    )
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