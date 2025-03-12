import { PropertyReport } from '@/types/property';

export const fetchAirbnbListing = async (url: string): Promise<PropertyReport> => {
  try {
    // Extract listing ID from URL
    const listingId = url.match(/\/rooms\/(\d+)/)?.[1];
    if (!listingId) {
      throw new Error('Invalid Airbnb URL');
    }

    // Fetch listing data from Airbnb API
    const response = await fetch(`https://api.airbnb.com/v2/listings/${listingId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch from Airbnb API');
    }

    const data = await response.json();
    const listing = data.listing;

    // Transform the data to match our PropertyReport interface
    const report: PropertyReport = {
      type: 'airbnb',
      image: listing.picture_url || '',
      name: listing.name || '',
      city: listing.city || '',
      location: {
        lat: listing.lat?.toString() || '',
        lng: listing.lng?.toString() || ''
      },
      price: listing.price || 0,
      currency: listing.currency || 'USD'
    };

    return report;
  } catch (error) {
    console.error('Error fetching Airbnb listing:', error);
    throw error;
  }
}; 