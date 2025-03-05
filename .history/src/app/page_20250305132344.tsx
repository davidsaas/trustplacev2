import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container max-w-4xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            AirSafe
          </h1>
          <p className="text-xl text-muted-foreground">
            Get comprehensive safety reports for Airbnb listings in NYC and LA
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg">Sign Up</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              Log In
            </Button>
          </Link>
        </div>
        
        <div className="max-w-2xl mx-auto rounded-lg overflow-hidden shadow-xl bg-card">
          <div className="bg-muted p-6">
            <h2 className="text-2xl font-bold mb-4">
              Know before you book
            </h2>
            <p className="text-muted-foreground">
              AirSafe analyzes Airbnb listings to provide safety metrics, extracts safety-focused reviews, and recommends safer alternatives at similar price points.
            </p>
          </div>
          <div className="p-6 grid gap-4 sm:grid-cols-2">
            <div className="flex gap-2 items-start">
              <div className="rounded-full p-1 border bg-background w-8 h-8 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Location Safety</h3>
                <p className="text-sm text-muted-foreground">OpenStreetMap-based safety metrics for the neighborhood</p>
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <div className="rounded-full p-1 border bg-background w-8 h-8 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Safety Reviews</h3>
                <p className="text-sm text-muted-foreground">Identified safety reviews from previous guests</p>
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <div className="rounded-full p-1 border bg-background w-8 h-8 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Safer Alternatives</h3>
                <p className="text-sm text-muted-foreground">Find safer options at similar price points</p>
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <div className="rounded-full p-1 border bg-background w-8 h-8 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Save Reports</h3>
                <p className="text-sm text-muted-foreground">Save and compare multiple properties</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
