import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const initializeReport = async (url: string, type: string) => {
  try {
    if (type === 'airbnb') {
      // Existing Airbnb logic
      const normalizedUrl = normalizeAirbnbUrl(url);
      const { success, data: listings, error: fetchError } = await fetchLAListings();
      
      if (!success || !listings) {
        throw new Error(fetchError || 'Failed to fetch listings');
      }

      const matchingListing = listings.find(listing => 
        normalizeAirbnbUrl(listing.url) === normalizedUrl
      );

      if (!matchingListing) {
        console.log('Available listings:', listings.map(l => ({ url: l.url, normalized: normalizeAirbnbUrl(l.url) })));
        throw new Error('Listing not found');
      }

      console.log('Found matching listing:', JSON.stringify(matchingListing, null, 2));
      return matchingListing;
    } else if (type === 'booking') {
      // Fetch Booking.com data directly from our API
      const response = await fetch(`/api/report?url=${encodeURIComponent(url)}&type=booking`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Booking.com data');
      }
      const data = await response.json();
      return data;
    } else {
      throw new Error('Invalid listing type');
    }
  } catch (error) {
    console.error('Error initializing report:', error);
    throw error;
  }
};

export default function ReportContent({ url, type }: { url: string, type: string }) {
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await initializeReport(url, type);
        setListing(data);
      } catch (error: any) {
        setError(error.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [url, type]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
    </div>;
  }

  if (error) {
    return <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-safety-red mb-4">
        <AlertTriangle className="h-12 w-12" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Report</h2>
      <p className="text-gray-600 text-center">{error}</p>
      <Button 
        onClick={() => window.history.back()}
        className="mt-4 bg-brand hover:bg-brand/90"
      >
        Go Back
      </Button>
    </div>;
  }

  // ... rest of your existing render logic ...
} 