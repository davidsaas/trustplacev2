"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { useAuth } from "./providers/auth-provider";

export function NavWrapper() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Don't show navbar on public-only routes
  const publicOnlyRoutes = ["/login", "/signup"];
  const isPublicOnlyRoute = publicOnlyRoutes.includes(pathname);
  
  // Hide navbar on public-only routes or on root path when not authenticated
  const hideNavbar = isPublicOnlyRoute || (pathname === "/" && !user);
  
  if (hideNavbar) return null;
  
  return <Navbar />;
} 