"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { useAuth } from "./providers/auth-provider";

export function NavWrapper() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  
  // Don't show navbar while auth state is loading
  if (loading) return null;
  
  // Don't show navbar on auth routes
  const authRoutes = ["/login", "/signup"];
  if (authRoutes.includes(pathname)) return null;
  
  // Don't show navbar on landing page for non-authenticated users
  if (pathname === "/" && !user) return null;
  
  return <Navbar />;
} 