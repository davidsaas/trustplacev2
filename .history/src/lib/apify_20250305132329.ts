import { ApifyDataset, ApifyAirbnbListing } from './apify-types';

const APIFY_LA_DATASET_ID = 'zaa5uKgGaiCddkejc';
const APIFY_LA_TASK_ID = 'apptrustplace/airbnb-scraper-task---la';

export async function getLatestLAListings(limit: number = 100, offset: number = 0): Promise<ApifyDataset> {
  try {
    const response = await fetch(
      `https://api.apify.com/v2/datasets/${APIFY_LA_DATASET_ID}/items?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch LA listings from Apify');
    }

    const data = await response.json();
    return {
      items: data,
      total: data.length,
      offset,
      count: data.length,
      limit,
    };
  } catch (error) {
    console.error('Error fetching LA listings:', error);
    throw error;
  }
}

export async function findListingByUrl(url: string): Promise<ApifyAirbnbListing | null> {
  try {
    // Clean the URL to match Apify's format
    const cleanUrl = url.split('?')[0].replace(/\/$/, '');
    
    const response = await fetch(
      `https://api.apify.com/v2/datasets/${APIFY_LA_DATASET_ID}/items?filter={"url":"${cleanUrl}"}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch listing from Apify');
    }

    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.error('Error finding listing:', error);
    throw error;
  }
}

export function calculateSafetyScore(listing: ApifyAirbnbListing): number {
  let score = 70; // Base score

  // Factor 1: Reviews mentioning safety
  const safetyKeywords = ['safe', 'secure', 'security', 'neighborhood', 'area', 'location', 'quiet', 'peaceful'];
  const safetyReviews = listing.reviews.filter(review => 
    safetyKeywords.some(keyword => review.text.toLowerCase().includes(keyword))
  );
  
  // Adjust score based on safety-related reviews ratio
  const safetyReviewsRatio = safetyReviews.length / listing.reviews.length;
  score += safetyReviewsRatio * 10;

  // Factor 2: Rating score
  if (listing.rating) {
    score += (listing.rating.score / 5) * 10;
  }

  // Factor 3: Number of reviews (more reviews = more reliable data)
  if (listing.rating && listing.rating.count > 0) {
    score += Math.min(listing.rating.count / 50, 1) * 10; // Max 10 points for 50+ reviews
  }

  // Factor 4: Amenities related to safety
  const safetyAmenities = [
    'security camera',
    'smoke alarm',
    'carbon monoxide alarm',
    'fire extinguisher',
    'first aid kit',
    'doorman',
    'private entrance',
  ];
  
  const safetyAmenitiesCount = listing.amenities.filter(amenity =>
    safetyAmenities.some(safetyAmenity => 
      amenity.toLowerCase().includes(safetyAmenity)
    )
  ).length;
  
  score += (safetyAmenitiesCount / safetyAmenities.length) * 10;

  // Ensure score is between 0 and 100
  return Math.min(Math.max(Math.round(score), 0), 100);
}

export function extractSafetyReviews(listing: ApifyAirbnbListing) {
  const safetyKeywords = ['safe', 'secure', 'security', 'neighborhood', 'area', 'location', 'quiet', 'peaceful'];
  
  return listing.reviews
    .filter(review => 
      safetyKeywords.some(keyword => review.text.toLowerCase().includes(keyword))
    )
    .map(review => ({
      id: review.id,
      text: review.text,
      date: review.date,
      author: review.author.name,
      isSafetyRelated: true
    }));
}

export function findSaferAlternatives(
  listing: ApifyAirbnbListing,
  allListings: ApifyAirbnbListing[],
  maxPriceDiff: number = 50,
  limit: number = 2
): ApifyAirbnbListing[] {
  const listingSafetyScore = calculateSafetyScore(listing);
  const listingPrice = listing.price.rate;

  return allListings
    .filter(alt => 
      alt.id !== listing.id && 
      Math.abs(alt.price.rate - listingPrice) <= maxPriceDiff
    )
    .map(alt => ({
      ...alt,
      safetyScore: calculateSafetyScore(alt)
    }))
    .filter(alt => alt.safetyScore > listingSafetyScore)
    .sort((a, b) => b.safetyScore - a.safetyScore)
    .slice(0, limit);
} 