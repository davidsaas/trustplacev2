export interface PropertyReport {
  type: 'airbnb' | 'booking';
  image: string;
  name: string;
  city: string;
  location: {
    lat: string;
    lng: string;
  };
  price: number;
  currency: string;
} 