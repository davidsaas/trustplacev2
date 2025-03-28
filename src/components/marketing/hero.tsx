import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface HeroProps {
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  image: {
    data: {
      attributes: {
        url: string;
        width: number;
        height: number;
        alternativeText: string;
      };
    };
  };
}

export function Hero({ title, description, ctaText, ctaLink, image }: HeroProps) {
  return (
    <div className="relative isolate overflow-hidden bg-white">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
        <div className="mx-auto max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-xl lg:pt-8">
          <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            {description}
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <Button asChild size="lg">
              <a href={ctaLink}>{ctaText}</a>
            </Button>
          </div>
        </div>
        <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            <Image
              src={image.data.attributes.url}
              alt={image.data.attributes.alternativeText}
              width={image.data.attributes.width}
              height={image.data.attributes.height}
              className="w-[76rem] rounded-md bg-gray-50 shadow-xl ring-1 ring-gray-400/10"
            />
          </div>
        </div>
      </div>
    </div>
  );
} 