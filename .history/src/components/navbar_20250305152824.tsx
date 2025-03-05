"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  Search, 
  Menu, 
  LogOut, 
  User, 
  Heart, 
  Home, 
  Shield, 
  Instagram, 
  Twitter, 
  Facebook,
  HelpCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { normalizeAirbnbUrl } from "@/lib/apify";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();

    // Add scroll event listener
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Check if it's an Airbnb URL
      if (searchQuery.includes("airbnb.com")) {
        const normalizedUrl = normalizeAirbnbUrl(searchQuery);
        router.push(`/report?url=${encodeURIComponent(normalizedUrl)}`);
      } else {
        // Treat as a location search
        router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  // Determine if we're on the homepage
  const isHomePage = pathname === "/";

  return (
    <header 
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled || !isHomePage 
          ? "bg-white shadow-sm" 
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-8 w-8">
              <Image 
                src="/logo.svg" 
                alt="TrustPlace Logo" 
                fill 
                className="object-contain"
              />
            </div>
            <span className="font-bold text-xl text-blue-600">TrustPlace</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link 
              href="/dashboard" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/dashboard" 
                  ? "text-blue-600 bg-blue-50" 
                  : "text-gray-700 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              Dashboard
            </Link>
            <Link 
              href="/saved" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/saved" 
                  ? "text-blue-600 bg-blue-50" 
                  : "text-gray-700 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              Saved Reports
            </Link>
            <Link 
              href="/about" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/about" 
                  ? "text-blue-600 bg-blue-50" 
                  : "text-gray-700 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              About
            </Link>
          </nav>

          {/* Search Bar */}
          <form 
            onSubmit={handleSearch} 
            className="hidden md:flex relative max-w-md flex-1 mx-4"
          >
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search locations or paste Airbnb URL"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-full border-gray-200 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
            </div>
            <Button 
              type="submit" 
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 px-3 bg-blue-600 hover:bg-blue-700"
            >
              Search
            </Button>
          </form>

          {/* User Menu (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full h-10 w-10 p-0">
                    <Avatar>
                      <AvatarImage src={user.user_metadata?.avatar_url || ""} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {user.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/saved")}>
                    <Heart className="mr-2 h-4 w-4" />
                    Saved Reports
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => router.push("/login")} className="bg-blue-600 hover:bg-blue-700">
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <div className="py-4">
                {/* Mobile Search */}
                <form onSubmit={handleSearch} className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search locations or paste Airbnb URL"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full rounded-lg"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                  >
                    Search
                  </Button>
                </form>

                {/* Mobile Navigation */}
                <nav className="space-y-2">
                  <Link 
                    href="/" 
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-blue-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Home className="h-5 w-5 text-blue-600" />
                    Home
                  </Link>
                  <Link 
                    href="/dashboard" 
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-blue-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Shield className="h-5 w-5 text-blue-600" />
                    Dashboard
                  </Link>
                  <Link 
                    href="/saved" 
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-blue-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Heart className="h-5 w-5 text-blue-600" />
                    Saved Reports
                  </Link>
                  <Link 
                    href="/about" 
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-blue-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <HelpCircle className="h-5 w-5 text-blue-600" />
                    About
                  </Link>
                </nav>

                {/* Social Links */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Follow Us</h4>
                  <div className="flex gap-4">
                    <a 
                      href="https://instagram.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                    <a 
                      href="https://twitter.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <Twitter className="h-5 w-5" />
                    </a>
                    <a 
                      href="https://facebook.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <Facebook className="h-5 w-5" />
                    </a>
                  </div>
                </div>

                {/* User Section */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.user_metadata?.avatar_url || ""} />
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {user.email?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.email}</p>
                          <p className="text-sm text-gray-500">Logged in</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => {
                          handleSignOut();
                          setIsMobileMenuOpen(false);
                        }} 
                        variant="outline" 
                        className="w-full border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button 
                        onClick={() => {
                          router.push("/login");
                          setIsMobileMenuOpen(false);
                        }} 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        Sign In
                      </Button>
                      <Button 
                        onClick={() => {
                          router.push("/register");
                          setIsMobileMenuOpen(false);
                        }} 
                        variant="outline" 
                        className="w-full"
                      >
                        Create Account
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
} 