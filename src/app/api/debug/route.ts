import { NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/env';

export async function GET(request: Request) {
  // Get request information
  const url = new URL(request.url);
  const host = url.host;
  const pathname = url.pathname;
  
  // Get base URL from our utility
  const baseUrlFromUtil = getBaseUrl();
  
  // Get environment variables (only expose safe ones)
  const environmentInfo = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL || null,
    VERCEL_ENV: process.env.VERCEL_ENV || null,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || null,
  };
  
  // Get headers
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    // Filter out sensitive headers
    if (!['cookie', 'authorization', 'x-real-ip'].includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });
  
  return NextResponse.json({
    request: {
      url: request.url,
      host,
      pathname,
      headers,
    },
    environment: environmentInfo,
    baseUrl: baseUrlFromUtil,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    }
  });
} 