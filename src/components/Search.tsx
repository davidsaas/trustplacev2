'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validateUrl = (url: string) => {
    const airbnbPattern = /^https?:\/\/(www\.)?airbnb\.[a-z.]+\/rooms\/\d+/i;
    const bookingPattern = /^https?:\/\/(www\.)?booking\.com\/hotel\//i;
    
    if (airbnbPattern.test(url)) {
      return { isValid: true, type: 'airbnb' };
    }
    
    if (bookingPattern.test(url)) {
      return { isValid: true, type: 'booking' };
    }
    
    return { isValid: false, type: null };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateUrl(searchQuery);
    
    if (!validation.isValid) {
      setError('Please enter a valid Airbnb or Booking.com listing URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/report?url=${encodeURIComponent(searchQuery)}&type=${validation.type}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch listing data');
      }
      
      const data = await response.json();
      router.push(`/report?url=${encodeURIComponent(searchQuery)}&type=${validation.type}`);
    } catch (error: any) {
      setError(error.message || 'Failed to fetch listing data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setError(null); // Clear error when input changes
            }}
            placeholder="Enter Airbnb or Booking.com listing URL"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 px-4 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
        {error && (
          <div className="text-red-500 text-sm mt-2">
            {error}
          </div>
        )}
        <div className="text-sm text-gray-500">
          Supported formats:
          <ul className="list-disc list-inside mt-1">
            <li>Airbnb: https://www.airbnb.com/rooms/12345...</li>
            <li>Booking.com: https://www.booking.com/hotel/...</li>
          </ul>
        </div>
      </form>
    </div>
  );
}