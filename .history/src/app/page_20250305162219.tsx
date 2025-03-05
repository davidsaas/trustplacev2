"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Shield, MapPin, Star, CheckCircle, Menu, X } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const keywords = ["safe", "trusted", "verified", "secure"];

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };

    checkUser();

    // Rotate keywords
    const interval = setInterval(() => {
      setCurrentKeywordIndex((prevIndex) => (prevIndex + 1) % keywords.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [keywords.length]);

  const handleGetStarted = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen">
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-safety-green/10 rounded-full blur-3xl -z-10 transform translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-brand/10 rounded-full blur-3xl -z-10 transform -translate-x-1/3 translate-y-1/3"></div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-0 w-full">
            <div className="absolute top-0 right-0 p-4">
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-foreground"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col items-center justify-center h-full gap-8 text-foreground">
              <Link href="/features" className="text-xl font-medium hover:text-brand">
                Features
              </Link>
              <Link href="/pricing" className="text-xl font-medium hover:text-brand">
                Pricing
              </Link>
              <Link href="/contact" className="text-xl font-medium hover:text-brand">
                Contact
              </Link>
              {user ? (
                <Link href="/dashboard" className="text-xl font-medium text-brand">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="text-xl font-medium hover:text-brand">
                    Log in
                  </Link>
                  <Link 
                    href="/signup" 
                    className="px-6 py-3 text-xl font-medium bg-brand text-white rounded-full hover:bg-brand/90"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center">
          <div className="relative h-8 w-32">
            <Image
              src="/images/pinkLogo.svg" 
              alt="TrustPlace Logo" 
              fill 
              className="object-contain"
            />
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/features" className="text-foreground hover:text-brand transition-colors">
            Features
          </Link>
          <Link href="/pricing" className="text-foreground hover:text-brand transition-colors">
            Pricing
          </Link>
          <Link href="/contact" className="text-foreground hover:text-brand transition-colors">
            Contact
          </Link>
          {!loading && (
            <>
              {user ? (
                <Link 
                  href="/dashboard" 
                  className="px-4 py-2 bg-brand text-white rounded-full hover:bg-brand/90 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="text-foreground hover:text-brand transition-colors">
                    Log in
                  </Link>
                  <Link 
                    href="/signup" 
                    className="px-4 py-2 bg-brand text-white rounded-full hover:bg-brand/90 transition-colors"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </>
          )}
        </nav>
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-black">Discover</span><br />
                <span className="text-brand">risk zones</span><br />
                <span className="text-black">before you travel</span>
              </h1>
              <p className="text-xl mb-8 text-foreground/80">
                Make confident decisions with real-time safety data and local insights you can trust.
              </p>
              <div className="w-full max-w-xl mx-auto md:mx-0">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  router.push('/login');
                }} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search any city or neighborhood..."
                      className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring focus:ring-opacity-50"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-brand text-white rounded-full text-lg font-medium hover:bg-brand/90 transition-colors inline-flex items-center justify-center"
                  >
                    Search
                  </button>
                </form>
              </div>
            </div>
            
            <div className="md:w-1/2 relative">
              <div className="relative rounded-2xl overflow-hidden">
                <Image 
                  src="/images/hero-image.jpg" 
                  alt="City view with safety overlay" 
                  width={600}
                  height={400}
                  className="w-full h-auto rounded-2xl"
                />
                <div className="absolute top-4 right-4 bg-green-400 text-white text-sm font-bold px-3 py-1 rounded-full">
                  Neighborhood Safety
                </div>
                <div className="absolute top-4 left-4 bg-yellow-400 text-white text-sm font-bold px-3 py-1 rounded-full">
                  Transportation Safety
                </div>
                <div className="absolute bottom-4 left-4 bg-red-400 text-white text-sm font-bold px-3 py-1 rounded-full">
                  Residential Safety
                </div>
                <div className="absolute bottom-4 right-4 bg-teal-400 text-white text-sm font-bold px-3 py-1 rounded-full">
                  Tourist Safety
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-70">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Insights based on</div>
            <div className="h-8 w-24 relative">
              <Image src="/images/reddit.svg" alt="Reddit" fill className="object-contain" />
            </div>
            <div className="h-8 w-24 relative">
              <Image src="/images/tripadvisor.svg" alt="TripAdvisor" fill className="object-contain" />
            </div>
            <div className="h-8 w-24 relative">
              <Image src="/images/airbnb.svg" alt="Airbnb" fill className="object-contain" />
            </div>
            <div className="h-8 w-24 relative">
              <Image src="/images/booking.svg" alt="Booking.com" fill className="object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-black">Real Stories from Travelers</h2>
          <p className="text-center text-gray-600 mb-12">See how TrustPlace helps travelers avoid unsafe situations</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-6 rounded-xl">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-bold mr-3">
                  SC
                </div>
                <div>
                  <h3 className="font-bold">Sarah Chen</h3>
                  <div className="flex">
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                  </div>
                </div>
              </div>
              <p className="text-foreground/80">
                "I almost booked an Airbnb in a dangerous area of Los Angeles. TrustPlace's safety report warned me and I found a better spot."
              </p>
            </div>
            
            <div className="glass p-6 rounded-xl">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-safety-green flex items-center justify-center text-white font-bold mr-3">
                  MR
                </div>
                <div>
                  <h3 className="font-bold">Michael Rodriguez</h3>
                  <div className="flex">
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                  </div>
                </div>
              </div>
              <p className="text-foreground/80">
                "Traveling with my family, I use TrustPlace for every booking. The neighborhood crime data helped me find a safe area and avoid problems."
              </p>
            </div>
            
            <div className="glass p-6 rounded-xl">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-safety-yellow flex items-center justify-center text-white font-bold mr-3">
                  ET
                </div>
                <div>
                  <h3 className="font-bold">Emma Thompson</h3>
                  <div className="flex">
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                  </div>
                </div>
              </div>
              <p className="text-foreground/80">
                "Before TrustPlace, I had a frightening experience with an unsafe Airbnb. Now I feel confident with my property choices and enjoy my travels!"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Insights Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-black">Discover Safety Insights</h2>
          <p className="text-center text-gray-600 mb-12">Make confident decisions with our comprehensive safety tools</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="flex flex-col">
              <h3 className="text-xl font-bold mb-4">Community Insights</h3>
              <p className="text-gray-600 mb-6">Access real experiences and safety tips from locals and frequent visitors. Our community-driven insights help you make safe decisions about where to stay, eat, and explore.</p>
              <div className="glass p-4 rounded-xl mt-auto">
                <div className="text-sm text-brand font-medium">Community Insights feature showing user reviews and safety tips</div>
              </div>
            </div>
            
            <div className="flex flex-col">
              <h3 className="text-xl font-bold mb-4">Official Safety Metrics</h3>
              <p className="text-gray-600 mb-6">Get comprehensive safety scores based on official data, crime statistics, and verified reports. Our metrics cover everything from street safety to neighborhood security.</p>
              <div className="glass p-4 rounded-xl mt-auto">
                <div className="text-sm text-brand font-medium">Safety metrics dashboard showing various safety indicators</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Map Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-black">Interactive Safety Map</h2>
          <p className="text-center text-gray-600 mb-12">Explore neighborhoods through our interactive map with real-time safety overlays. Visualize safe zones, risk areas, and get location-specific safety recommendations.</p>
          
          <div className="flex flex-col md:flex-row gap-12">
            <div className="md:w-1/2">
              <div className="glass p-4 rounded-xl h-full">
                <div className="text-sm text-brand font-medium">Interactive map interface with safety overlay</div>
              </div>
            </div>
            
            <div className="md:w-1/2">
              <div className="glass p-4 rounded-xl h-full">
                <div className="text-sm text-brand font-medium">Interactive map data feed with safety insights</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-black">Popular Destinations</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="rounded-xl overflow-hidden relative group">
              <div className="aspect-w-16 aspect-h-9">
                <Image 
                  src="https://images.unsplash.com/photo-1544413660-299165566b1d" 
                  alt="Los Angeles" 
                  width={400}
                  height={225}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4">
                <h3 className="text-xl font-bold text-white">Los Angeles</h3>
                <p className="text-white/80 text-sm">California, United States</p>
              </div>
            </div>
            
            <div className="rounded-xl overflow-hidden relative group">
              <div className="aspect-w-16 aspect-h-9">
          <Image
                  src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad" 
                  alt="London" 
                  width={400}
                  height={225}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4">
                <h3 className="text-xl font-bold text-white">London</h3>
                <p className="text-white/80 text-sm">England, UK</p>
              </div>
            </div>
            
            <div className="rounded-xl overflow-hidden relative group">
              <div className="aspect-w-16 aspect-h-9">
          <Image
                  src="https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9" 
                  alt="New York" 
                  width={400}
                  height={225}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4">
                <h3 className="text-xl font-bold text-white">New York</h3>
                <p className="text-white/80 text-sm">New York, United States</p>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-gray-600">More cities coming soon</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-black">Frequently Asked Questions</h2>
          
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <button className="flex justify-between items-center w-full text-left">
                <h3 className="text-lg font-medium">How do you measure safety scores?</h3>
                <span>+</span>
              </button>
            </div>
            
            <div className="border-b border-gray-200 pb-4">
              <button className="flex justify-between items-center w-full text-left">
                <h3 className="text-lg font-medium">How often is the data updated?</h3>
                <span>+</span>
              </button>
            </div>
            
            <div className="border-b border-gray-200 pb-4">
              <button className="flex justify-between items-center w-full text-left">
                <h3 className="text-lg font-medium">Can I trust the information?</h3>
                <span>+</span>
              </button>
            </div>
            
            <div className="border-b border-gray-200 pb-4">
              <button className="flex justify-between items-center w-full text-left">
                <h3 className="text-lg font-medium">What makes TrustPlace different?</h3>
                <span>+</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-12 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="relative h-8 w-32">
          <Image
                  src="/images/pinkLogo.svg" 
                  alt="TrustPlace Logo" 
                  fill 
                  className="object-contain"
                />
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-8">
              <div>
                <h4 className="font-bold mb-2">PRODUCT</h4>
                <ul className="space-y-1">
                  <li><Link href="/features" className="text-gray-600 hover:text-brand">Features</Link></li>
                  <li><Link href="/pricing" className="text-gray-600 hover:text-brand">Pricing</Link></li>
                  <li><Link href="/faq" className="text-gray-600 hover:text-brand">FAQ</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold mb-2">LEGAL</h4>
                <ul className="space-y-1">
                  <li><Link href="/privacy" className="text-gray-600 hover:text-brand">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="text-gray-600 hover:text-brand">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 md:mt-0 text-sm text-foreground/70">
              &copy; {new Date().getFullYear()} TrustPlace. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
      
      {/* Chat Button */}
      <div className="fixed bottom-4 right-4 z-10">
        <button className="bg-brand text-white rounded-full p-4 shadow-lg hover:bg-brand/90 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
