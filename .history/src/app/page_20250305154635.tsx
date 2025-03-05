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
      
      if (data.user) {
        router.push("/dashboard");
      }
    };
    
    checkUser();
    
    // Rotate keywords
    const interval = setInterval(() => {
      setCurrentKeywordIndex((prevIndex) => (prevIndex + 1) % keywords.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [router]);

  if (loading) return null;
  
  if (user) return null; // Will redirect to dashboard

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50/50 to-white">
      {/* Landing Page Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="relative h-8 w-8">
                <Image 
                  src="/logo.svg" 
                  alt="TrustPlace Logo" 
                  fill 
                  className="object-contain"
                />
              </div>
              <span className="font-bold text-xl text-blue-600">TrustPlace</span>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors">How It Works</a>
              <a href="#testimonials" className="text-gray-600 hover:text-blue-600 transition-colors">Testimonials</a>
              <Link href="/login" className="text-gray-600 hover:text-blue-600 transition-colors">Login</Link>
              <Link 
                href="/register" 
                className="bg-blue-600/90 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Sign Up
              </Link>
            </nav>
            
            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100">
              <nav className="flex flex-col gap-4">
                <a 
                  href="#features" 
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </a>
                <a 
                  href="#how-it-works" 
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How It Works
                </a>
                <a 
                  href="#testimonials" 
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Testimonials
                </a>
                <Link 
                  href="/login" 
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className="bg-blue-600/90 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-block w-fit"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <div className="pt-8 md:pt-16">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2 space-y-6">
              <div className="inline-block bg-blue-100/70 text-blue-600 px-4 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                Airbnb Safety Reports
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900">
                Find <span className="relative">
                  <span className="text-blue-600 inline-block min-w-32 transition-opacity duration-500">
                    {keywords[currentKeywordIndex]}
                  </span>
                  <span className="absolute bottom-0 left-0 w-full h-2 bg-blue-100/70"></span>
                </span> stays on Airbnb
              </h1>
              <p className="text-lg text-gray-600">
                TrustPlace helps you make informed decisions about your Airbnb bookings with comprehensive safety reports, neighborhood insights, and verified reviews.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/register" 
                  className="bg-blue-600/90 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium text-center transition-colors shadow-md hover:shadow-lg"
                >
                  Get Started — It's Free
                </Link>
                <Link 
                  href="/login" 
                  className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-medium text-center transition-colors backdrop-blur-sm bg-white/50"
                >
                  Sign In
                </Link>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>No credit card required</span>
              </div>
            </div>
            <div className="md:w-1/2 relative">
              <div className="relative h-[400px] w-full rounded-xl overflow-hidden shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-500/30 flex items-center justify-center">
                  <div className="text-center p-8">
                    <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900">Safe Airbnb Stays</h3>
                    <p className="text-gray-700">Comprehensive safety reports for your next trip</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 bg-white/80 backdrop-blur-md p-4 rounded-lg shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Shield className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Safety Score: 92/100</h3>
                      <p className="text-sm text-gray-600">This neighborhood is considered very safe for travelers</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white/90 backdrop-blur-md p-4 rounded-lg shadow-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <div>
                    <p className="font-medium">4.9 out of 5 stars</p>
                    <p className="text-sm text-gray-500">Based on 2,500+ reviews</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trusted By Section */}
      <div className="py-12 bg-white/70 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-500 mb-8">Trusted by travelers who book on</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            <div className="relative h-8 w-24 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all">
              <Image 
                src="/images/social/airbnb.svg" 
                alt="Airbnb" 
                fill 
                className="object-contain"
              />
            </div>
            <div className="relative h-8 w-24 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all">
              <Image 
                src="/images/social/booking.svg" 
                alt="Booking.com" 
                fill 
                className="object-contain"
              />
            </div>
            <div className="relative h-8 w-24 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all">
              <Image 
                src="/images/social/tripadvisor.svg" 
                alt="TripAdvisor" 
                fill 
                className="object-contain"
              />
            </div>
            <div className="relative h-8 w-24 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all">
              <Image 
                src="/images/social/reddit.svg" 
                alt="Reddit" 
                fill 
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-16 md:py-24 bg-gradient-to-b from-white to-blue-50/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need for safe travels
            </h2>
            <p className="text-lg text-gray-600">
              Our comprehensive safety reports give you all the information you need to make confident booking decisions.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-blue-100/50 shadow-sm hover:shadow-md transition-all">
              <div className="bg-blue-100/70 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Safety Scores</h3>
              <p className="text-gray-600">
                Get detailed safety metrics based on crime data, neighborhood reviews, and local insights.
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-emerald-100/50 shadow-sm hover:shadow-md transition-all">
              <div className="bg-emerald-100/70 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Neighborhood Analysis</h3>
              <p className="text-gray-600">
                Understand the area with walkability scores, public transport options, and nearby amenities.
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-amber-100/50 shadow-sm hover:shadow-md transition-all">
              <div className="bg-amber-100/70 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Verified Reviews</h3>
              <p className="text-gray-600">
                Read safety-focused reviews from real travelers who have stayed at the property.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="py-16 md:py-24 bg-gradient-to-b from-blue-50/30 to-white/80">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How TrustPlace works
            </h2>
            <p className="text-lg text-gray-600">
              Get comprehensive safety information in just a few simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/90 backdrop-blur-md p-6 rounded-xl shadow-sm hover:shadow-md transition-all relative">
              <div className="absolute -top-4 -left-4 bg-blue-600/90 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-2">Paste Airbnb URL</h3>
              <p className="text-gray-600">
                Simply copy and paste the Airbnb listing URL you're interested in.
              </p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-md p-6 rounded-xl shadow-sm hover:shadow-md transition-all relative">
              <div className="absolute -top-4 -left-4 bg-blue-600/90 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-2">Get Safety Report</h3>
              <p className="text-gray-600">
                Our system analyzes the location and generates a comprehensive safety report.
              </p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-md p-6 rounded-xl shadow-sm hover:shadow-md transition-all relative">
              <div className="absolute -top-4 -left-4 bg-blue-600/90 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-2">Book with Confidence</h3>
              <p className="text-gray-600">
                Make an informed decision based on real safety data and traveler insights.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div id="testimonials" className="py-16 md:py-24 bg-gradient-to-b from-white/80 to-blue-50/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What our users say
            </h2>
            <p className="text-lg text-gray-600">
              Join thousands of travelers who trust our safety reports
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative h-12 w-12 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
                  <div className="text-blue-600 font-bold">SJ</div>
                </div>
                <div>
                  <h4 className="font-semibold">Sarah Johnson</h4>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "TrustPlace helped me find a safe neighborhood for my solo trip to LA. The safety report was detailed and accurate!"
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative h-12 w-12 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center">
                  <div className="text-emerald-600 font-bold">MC</div>
                </div>
                <div>
                  <h4 className="font-semibold">Michael Chen</h4>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "I travel with my family often and always check TrustPlace before booking. It's become an essential part of our travel planning."
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative h-12 w-12 rounded-full overflow-hidden bg-amber-100 flex items-center justify-center">
                  <div className="text-amber-600 font-bold">ER</div>
                </div>
                <div>
                  <h4 className="font-semibold">Emma Rodriguez</h4>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "The neighborhood analysis feature is amazing! It helped me find a place with great walkability and public transport options."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 md:py-24 bg-gradient-to-r from-blue-600/90 to-blue-700/90">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to travel with peace of mind?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of travelers who use TrustPlace to find safe and comfortable Airbnb stays.
          </p>
          <Link 
            href="/register" 
            className="inline-flex items-center gap-2 bg-white hover:bg-blue-50 text-blue-600 px-8 py-4 rounded-lg font-medium text-lg transition-colors shadow-md hover:shadow-lg"
          >
            Get Started for Free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-6 md:mb-0">
              <div className="relative h-8 w-8">
                <Image 
                  src="/logo.svg" 
                  alt="TrustPlace Logo" 
                  fill 
                  className="object-contain brightness-200"
                />
              </div>
              <span className="font-bold text-xl text-white">TrustPlace</span>
            </div>
            
            <div className="flex gap-8 mb-6 md:mb-0">
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
            
            <div className="flex gap-4">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-gray-800 transition-colors"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-gray-800 transition-colors"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-gray-800 transition-colors"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p>&copy; {new Date().getFullYear()} TrustPlace. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
