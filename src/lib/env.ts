/**
 * Environment utilities for handling URLs and configuration
 * across different environments (development, production)
 */

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
    
    // Fallback for local development
    return 'http://localhost:3000';
  }
  
  // For client-side, use window.location
  // This ensures we're always using the current domain
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