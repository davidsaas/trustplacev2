/**
 * Environment utilities for handling URLs and configuration
 * across different environments (development, production)
 */

// For maximum robustness, we hard-code the production URL as a fallback
const PRODUCTION_URL = 'https://trustplace.vercel.app';

export const getBaseUrl = (): string => {
  // For SSR, use environment variables
  if (typeof window === 'undefined') {
    // First priority: explicitly set APP_URL
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    
    // Second priority: Vercel deployment URL
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    
    // Third priority: production environment, use production URL
    if (process.env.NODE_ENV === 'production') {
      return PRODUCTION_URL;
    }
    
    // Fallback for local development
    return 'http://localhost:3000';
  }
  
  // For client-side in production, we need to be extra careful
  if (process.env.NODE_ENV === 'production') {
    // Use production URL when in production
    return PRODUCTION_URL;
  }
  
  // For development, use window.location
  return window.location.origin;
};

/**
 * Get absolute URL by appending path to base URL
 */
export const getAbsoluteUrl = (path: string): string => {
  const baseUrl = getBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}; 