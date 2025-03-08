/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['randomuser.me', 'images.unsplash.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'randomuser.me',
        pathname: '/api/portraits/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  experimental: {
    serverExternalPackages: ['@prisma/client', 'bcrypt'],
  },
  // Configure for flexible rendering
  serverRuntimeConfig: {
    // Will only be available on the server side
    PROJECT_ROOT: __dirname,
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    API_URL: process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  },
  // Handle redirects
  async redirects() {
    const redirects = [];
    
    // Only add production redirects if we're not in development
    if (process.env.NODE_ENV === 'production') {
      redirects.push({
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: '(?!localhost).*\\.vercel\\.app',
          },
        ],
        permanent: true,
        destination: process.env.NEXT_PUBLIC_APP_URL || 'https://trustplace.vercel.app/:path*',
      });
    }
    
    return redirects;
  },
};

module.exports = nextConfig; 