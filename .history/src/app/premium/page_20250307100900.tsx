"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Check, AlertCircle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/components/providers/auth-provider";
import { createCheckoutSession } from "@/lib/stripe";

export default function PremiumPage() {
  const router = useRouter();
  const { user, userDetails, isPremium, loading, refreshUserDetails } = useAuth();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);

  // Check for successful Stripe redirect
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get("session_id");
      
      if (sessionId) {
        setCheckoutSuccess("Payment successful! Your premium features are now active.");
        // Clean up URL
        window.history.replaceState({}, document.title, "/premium");
        // Refresh user details to update premium status
        refreshUserDetails();
      }
    }
  }, [refreshUserDetails]);

  // Handle subscription upgrade
  const handleSubscribe = async () => {
    if (!user) {
      router.push("/login?redirect=/premium");
      return;
    }

    try {
      setIsCheckoutLoading(true);
      setCheckoutError(null);
      
      console.log('Creating checkout session for user:', user.id);
      
      // Create checkout session and redirect to Stripe
      const checkoutUrl = await createCheckoutSession(
        user.id,
        user.email || '',  // Pass the user's email
        `${window.location.origin}/premium`
      );
      
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      setCheckoutError(error.message || "An error occurred during checkout");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  // Features lists
  const basicFeatures = [
    "Basic safety reports",
    "Limited search capability",
    "Standard neighborhood data",
    "Basic alternatives suggestions"
  ];

  const premiumFeatures = [
    "Comprehensive safety reports with detailed metrics",
    "Unlimited saved reports",
    "Advanced neighborhood crime data analysis",
    "Premium safety insights with expert recommendations",
    "Priority access to new features",
    "Ad-free experience"
  ];

  return (
    <div className="min-h-screen relative">
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-safety-green/10 rounded-full blur-3xl -z-10 transform translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-brand/10 rounded-full blur-3xl -z-10 transform -translate-x-1/3 translate-y-1/3"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Upgrade to TrustPlace Premium
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Get comprehensive safety insights and premium features to make your Airbnb stays safer and more enjoyable.
          </p>
        </div>

        {checkoutSuccess && (
          <Alert className="mb-8 max-w-2xl mx-auto bg-green-50 text-green-800 border-green-200">
            <Check className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{checkoutSuccess}</AlertDescription>
          </Alert>
        )}

        {checkoutError && (
          <Alert className="mb-8 max-w-2xl mx-auto bg-red-50 text-red-800 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{checkoutError}</AlertDescription>
          </Alert>
        )}

        {isPremium ? (
          <div className="max-w-2xl mx-auto text-center p-8 glass rounded-xl shadow-md">
            <Shield className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're a Premium Member!</h2>
            <p className="text-gray-600 mb-6">
              You have access to all premium features until {userDetails?.premium_until ? new Date(userDetails.premium_until).toLocaleDateString() : 'your next billing cycle'}.
            </p>
            <Button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto grid gap-8 md:grid-cols-2">
            {/* Basic Plan */}
            <Card className="glass border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Basic</CardTitle>
                <CardDescription>Free plan with limited features</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">$0</span>
                  <span className="text-gray-500">/month</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3">
                  {basicFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push('/dashboard')}
                >
                  Current Plan
                </Button>
              </CardFooter>
            </Card>

            {/* Premium Plan */}
            <Card className="glass border-blue-200 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                RECOMMENDED
              </div>
              <CardHeader>
                <CardTitle className="text-xl font-bold text-blue-700">Premium</CardTitle>
                <CardDescription>Comprehensive safety insights</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">$9.99</span>
                  <span className="text-gray-500">/month</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3">
                  {premiumFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                  onClick={handleSubscribe}
                  disabled={isCheckoutLoading || loading}
                >
                  {isCheckoutLoading ? "Processing..." : "Upgrade Now"}
                  {!isCheckoutLoading && <ArrowRight className="h-4 w-4" />}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        <div className="mt-16 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Go Premium?</h2>
          <p className="text-gray-600 mb-8">
            Premium subscribers get access to in-depth safety analysis, detailed crime data for neighborhoods, and expert recommendations to ensure your stay is as safe as possible. Our premium insights can help you avoid potentially dangerous areas and make informed decisions about your accommodations.
          </p>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 glass rounded-xl shadow-sm">
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Enhanced Safety</h3>
              <p className="text-gray-600 text-sm">Make more informed decisions with our comprehensive safety data and analysis.</p>
            </div>
            
            <div className="p-6 glass rounded-xl shadow-sm">
              <div className="w-12 h-12 mx-auto mb-4 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Save Money</h3>
              <p className="text-gray-600 text-sm">Avoid costly mistakes by choosing safer locations and better-valued accommodations.</p>
            </div>
            
            <div className="p-6 glass rounded-xl shadow-sm">
              <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Peace of Mind</h3>
              <p className="text-gray-600 text-sm">Enjoy your trip with complete confidence knowing you've made the safest choice possible.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 