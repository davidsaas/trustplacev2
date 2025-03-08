"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { useAuth } from "./providers/auth-provider";

export function NavWrapper() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Don't show navbar on public-only routes and landing page when not authenticated
  const publicOnlyRoutes = ["/login", "/signup"];
  const isPublicOnlyRoute = publicOnlyRoutes.includes(pathname);
  const isLandingPage = pathname === "/";
  
  // Hide navbar on public-only routes or on landing page when not authenticated
  const hideNavbar = isPublicOnlyRoute || (isLandingPage && !user);
  
  if (hideNavbar) return null;
  
  return <Navbar />;
} 