import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'TrustPlace - Discover Safe Areas Before You Travel',
    template: '%s | TrustPlace',
  },
  description: 'Make confident decisions with real-time safety data and local insights you can trust.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://trustplace.vercel.app',
    siteName: 'TrustPlace',
    title: 'TrustPlace - Discover Safe Areas Before You Travel',
    description: 'Make confident decisions with real-time safety data and local insights you can trust.',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'TrustPlace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrustPlace - Discover Safe Areas Before You Travel',
    description: 'Make confident decisions with real-time safety data and local insights you can trust.',
    images: ['/images/og-image.jpg'],
    creator: '@trustplace',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {children}
    </div>
  );
} 