import { NextResponse } from 'next/server';
import { fetchAirbnbListing } from '@/lib/airbnb';
import { fetchBookingListing } from '@/lib/booking';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const type = searchParams.get('type');

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: 'Type parameter is required' }, { status: 400 });
    }

    let data;
    
    if (type === 'airbnb') {
      data = await fetchAirbnbListing(url);
    } else if (type === 'booking') {
      data = await fetchBookingListing(url);
    } else {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in report API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch listing data' },
      { status: 500 }
    );
  }
} 