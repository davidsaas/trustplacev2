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
              <Link href="/about" className="text-xl font-medium hover:text-brand">
                About
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
          <div className="safety-indicator mr-2">
            <span className="safety-dot safety-dot-red"></span>
            <span className="safety-dot safety-dot-yellow"></span>
            <span className="safety-dot safety-dot-green"></span>
          </div>
          <span className="text-xl font-bold text-brand">TrustPlace</span>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/about" className="text-foreground hover:text-brand transition-colors">
            About
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
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-brand">Safe</span> Airbnb Stays
              </h1>
              <p className="text-xl mb-8 text-foreground/80">
                Get comprehensive safety reports for your next trip. Know before you book with our{' '}
                <span className="text-brand font-medium">
                  {keywords[currentKeywordIndex]}
                </span>{' '}
                safety analysis.
              </p>
              <button
                onClick={handleGetStarted}
                className="px-8 py-3 bg-brand text-white rounded-full text-lg font-medium hover:bg-brand/90 transition-colors inline-flex items-center"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </div>
            
            <div className="md:w-1/2">
              <div className="glass rounded-2xl p-6 relative">
                <div className="absolute -top-3 -right-3 bg-safety-green text-white text-sm font-bold px-3 py-1 rounded-full">
                  95% Safe
                </div>
                
                <div className="flex items-start mb-6">
                  <div className="mr-4">
                    <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-brand" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">Safety Report</h3>
                    <p className="text-foreground/80">Comprehensive analysis of neighborhood safety</p>
                  </div>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-safety-green/20 flex items-center justify-center mr-3">
                      <CheckCircle className="h-4 w-4 text-safety-green" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Crime Rate</span>
                        <span className="text-safety-green font-medium">Low</span>
                      </div>
                      <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                        <div className="h-full bg-safety-green rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-safety-yellow/20 flex items-center justify-center mr-3">
                      <CheckCircle className="h-4 w-4 text-safety-yellow" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Walkability</span>
                        <span className="text-safety-yellow font-medium">Medium</span>
                      </div>
                      <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                        <div className="h-full bg-safety-yellow rounded-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-safety-green/20 flex items-center justify-center mr-3">
                      <CheckCircle className="h-4 w-4 text-safety-green" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Host Rating</span>
                        <span className="text-safety-green font-medium">Excellent</span>
                      </div>
                      <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                        <div className="h-full bg-safety-green rounded-full" style={{ width: '95%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold">SJ</div>
                      <div className="w-8 h-8 rounded-full bg-safety-green flex items-center justify-center text-white text-xs font-bold">MC</div>
                      <div className="w-8 h-8 rounded-full bg-safety-yellow flex items-center justify-center text-white text-xs font-bold">ER</div>
                    </div>
                    <span className="ml-2 text-sm text-foreground/80">3 reviews</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                    <Star className="h-4 w-4 text-safety-yellow fill-safety-yellow" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-brand">What Our Users Say</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass p-6 rounded-xl">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-bold mr-3">
                SJ
              </div>
              <div>
                <h3 className="font-bold">Sarah Johnson</h3>
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
              "TrustPlace helped me find a safe Airbnb in a new city. The safety report was detailed and accurate!"
            </p>
          </div>
          
          <div className="glass p-6 rounded-xl">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-safety-green flex items-center justify-center text-white font-bold mr-3">
                MC
              </div>
              <div>
                <h3 className="font-bold">Michael Chen</h3>
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
              "As a frequent traveler, I rely on TrustPlace for every booking. It's become an essential part of my travel planning."
            </p>
          </div>
          
          <div className="glass p-6 rounded-xl">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-safety-yellow flex items-center justify-center text-white font-bold mr-3">
                ER
              </div>
              <div>
                <h3 className="font-bold">Emma Rodriguez</h3>
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
              "The neighborhood analysis feature is incredible. It helped me avoid a potentially unsafe area during my LA trip."
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-12 border-t border-border">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="safety-indicator mr-2">
              <span className="safety-dot safety-dot-red"></span>
              <span className="safety-dot safety-dot-yellow"></span>
              <span className="safety-dot safety-dot-green"></span>
            </div>
            <span className="text-lg font-bold text-brand">TrustPlace</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-foreground/70">
            <Link href="/about" className="hover:text-brand">About</Link>
            <Link href="/privacy" className="hover:text-brand">Privacy</Link>
            <Link href="/terms" className="hover:text-brand">Terms</Link>
            <Link href="/contact" className="hover:text-brand">Contact</Link>
          </div>
          
          <div className="mt-4 md:mt-0 text-sm text-foreground/70">
            &copy; {new Date().getFullYear()} TrustPlace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
