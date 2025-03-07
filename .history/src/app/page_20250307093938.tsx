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
  
  // Updated keywords with colors
  const keywords = [
    { text: "Safe Areas", color: "bg-green-500/20 text-green-600" },
    { text: "Risk Zones", color: "bg-orange-500/20 text-orange-600" },
    { text: "Danger Spots", color: "bg-red-500/20 text-red-600" }
  ];

  useEffect(() => {
    // Only need to set loading state and rotate keywords
    setLoading(false);
    
    // Rotate keywords
    const interval = setInterval(() => {
      setCurrentKeywordIndex((prevIndex) => (prevIndex + 1) % keywords.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [keywords.length, router]);

  const handleGetStarted = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
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
          <div 
            className="relative h-8 w-32 cursor-pointer" 
            onClick={() => user ? router.push('/dashboard') : router.push('/')}
          >
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
                <span className={`inline-block px-3 py-1 rounded-lg ${keywords[currentKeywordIndex].color} transition-colors duration-500`}>
                  {keywords[currentKeywordIndex].text}
                </span><br />
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
                
                {/* Floating safety tags */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-sm font-medium px-3 py-1 rounded-full shadow-md flex items-center gap-1 transform hover:scale-105 transition-transform">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Neighborhood Safety
                </div>
                
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-sm font-medium px-3 py-1 rounded-full shadow-md flex items-center gap-1 transform hover:scale-105 transition-transform">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  Transportation Safety
                </div>
                
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm text-sm font-medium px-3 py-1 rounded-full shadow-md flex items-center gap-1 transform hover:scale-105 transition-transform">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Residential Safety
                </div>
                
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-sm font-medium px-3 py-1 rounded-full shadow-md flex items-center gap-1 transform hover:scale-105 transition-transform">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
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
            <div className="h-8 w-24 relative flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-700">
                <path fill="currentColor" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-18c4.411 0 8 3.589 8 8s-3.589 8-8 8-8-3.589-8-8 3.589-8 8-8zm3.434 5.566a3 3 0 00-4.868 0L12 11.101l1.434-1.535a3 3 0 014.868 0l-1.434 1.535a1 1 0 000 1.414l1.434 1.535a3 3 0 01-4.868 0L12 12.899l-1.434 1.535a3 3 0 01-4.868 0l1.434-1.535a1 1 0 000-1.414l-1.434-1.535a3 3 0 014.868 0L12 11.101l1.434-1.535z" />
              </svg>
              <span className="ml-1 font-bold">Reddit</span>
            </div>
            <div className="h-8 w-24 relative flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-700">
                <path fill="currentColor" d="M12.006 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13.5v2h2v-2h-2zm0 4v6h2v-6h-2z" />
              </svg>
              <span className="ml-1 font-bold">TripAdvisor</span>
            </div>
            <div className="h-8 w-24 relative flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-700">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7v-2z" />
              </svg>
              <span className="ml-1 font-bold">Airbnb</span>
            </div>
            <div className="h-8 w-24 relative flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-700">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2V7zm0 8h2v2h-2v-2z" />
              </svg>
              <span className="ml-1 font-bold">Booking</span>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="relative rounded-xl overflow-hidden group">
          <Image
                src="https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9" 
                alt="New York" 
                width={600} 
                height={400}
                className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-6">
                <h3 className="text-2xl font-bold text-white mb-1">New York</h3>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  <span className="text-white text-sm">Moderate Safety</span>
                </div>
              </div>
            </div>
            
            <div className="relative rounded-xl overflow-hidden group">
          <Image
                src="https://images.unsplash.com/photo-1580655653885-65763b2597d0" 
                alt="Los Angeles" 
                width={600} 
                height={400}
                className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-6">
                <h3 className="text-2xl font-bold text-white mb-1">Los Angeles</h3>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-white text-sm">High Safety</span>
                </div>
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
              <div 
                className="relative h-8 w-32 cursor-pointer" 
                onClick={() => user ? router.push('/dashboard') : router.push('/')}
              >
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
