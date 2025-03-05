export interface ApifyAirbnbListing {
  id: string;
  url: string;
  name: string;
  type: string;
  address: {
    street: string;
    suburb: string;
    city: string;
    state: string;
    country: string;
  };
  location: {
    lat: number;
    lng: number;
  };
  image: {
    url: string;
    caption: string;
  };
  price: {
    rate: number;
    currency: string;
  };
  rating: {
    score: number;
    count: number;
  };
  reviews: {
    id: string;
    text: string;
    date: string;
    author: {
      name: string;
      image?: string;
    };
  }[];
  amenities: string[];
  roomType: string;
  propertyType: string;
  hostName: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  lastScraped: string;
}

export interface ApifyDataset {
  items: ApifyAirbnbListing[];
  total: number;
  offset: number;
  count: number;
  limit: number;
} 