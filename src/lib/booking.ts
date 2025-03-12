import { PropertyReport } from '@/types/property';

const APIFY_ENDPOINT = 'https://api.apify.com/v2/datasets/f0zLgeObIt04pjSn4/items?clean=true&format=json';

const extractBookingId = (url: string): string | null => {
  // Extract hotel ID from various Booking.com URL formats
  const patterns = [
    /hotel\/[^/]+\/([^.]+)\./,  // Matches /hotel/country/id.
    /hotel\/([^/]+)\//          // Matches /hotel/id/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
};

export const fetchBookingListing = async (url: string): Promise<PropertyReport> => {
  try {
    console.log('Processing Booking.com URL:', url);
    
    const hotelId = extractBookingId(url);
    if (!hotelId) {
      throw new Error('Invalid Booking.com URL');
    }

    // Fetch data from Apify API
    const response = await fetch(APIFY_ENDPOINT);
    if (!response.ok) {
      throw new Error('Failed to fetch from Apify API');
    }

    const listings = await response.json();
    
    // Find the matching listing by hotel ID
    const listing = listings.find((item: any) => {
      const itemId = extractBookingId(item.url);
      return itemId === hotelId;
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    // Extract city from address
    const addressParts = listing.address?.full?.split(',') || [];
    const city = addressParts.length > 1 ? addressParts[1].trim() : '';

    // Transform the data to match our PropertyReport interface
    const report: PropertyReport = {
      type: 'booking',
      image: listing.image || listing.images?.[0] || '',
      name: listing.name,
      city,
      location: {
        lat: listing.location?.lat || '',
        lng: listing.location?.lng || ''
      },
      price: listing.price || listing.rooms?.[0]?.price || 0,
      currency: listing.currency || listing.rooms?.[0]?.currency || 'USD'
    };

    return report;
  } catch (error) {
    console.error('Error fetching Booking.com listing:', error);
    throw error;
  }
}; 