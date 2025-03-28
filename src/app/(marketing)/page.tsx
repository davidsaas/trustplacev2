import { Metadata } from 'next';
import { getHomePage } from '@/lib/strapi';
import { notFound } from 'next/navigation';
import { Hero } from '@/components/marketing/hero';
import { Features } from '@/components/marketing/features';
import { Testimonials } from '@/components/marketing/testimonials';
import { Partners } from '@/components/marketing/partners';
import { SafetyInsights } from '@/components/marketing/safety-insights';
import { InteractiveMap } from '@/components/marketing/interactive-map';
import { PopularDestinations } from '@/components/marketing/popular-destinations';
import { FAQ } from '@/components/marketing/faq';
import { Footer } from '@/components/marketing/footer';

export const revalidate = 3600; // Revalidate every hour

export async function generateMetadata(): Promise<Metadata> {
  const data = await getHomePage();
  
  if (!data?.data?.attributes?.seo) {
    return {};
  }

  const seo = data.data.attributes.seo;

  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    openGraph: {
      images: seo.shareImage?.data ? [
        {
          url: seo.shareImage.data.attributes.url,
          width: seo.shareImage.data.attributes.width,
          height: seo.shareImage.data.attributes.height,
          alt: seo.metaTitle,
        },
      ] : [],
    },
  };
}

export default async function LandingPage() {
  const data = await getHomePage();
  
  if (!data?.data?.attributes) {
    notFound();
  }

  const {
    hero,
    features,
    testimonials,
    partners,
    safetyInsights,
    interactiveMap,
    popularDestinations,
    faq,
  } = data.data.attributes;

  return (
    <>
      <Hero {...hero} />
      <Partners {...partners} />
      <Features {...features} />
      <Testimonials {...testimonials} />
      <SafetyInsights {...safetyInsights} />
      <InteractiveMap {...interactiveMap} />
      <PopularDestinations {...popularDestinations} />
      <FAQ {...faq} />
      <Footer />
    </>
  );
} 