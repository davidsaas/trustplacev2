"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { useAuth } from "./providers/auth-provider";

export function NavWrapper() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Don't show navbar on login and signup pages
  // Show navbar on root page only if user is authenticated
  const publicOnlyRoutes = ["/login", "/signup"];
  const isPublicOnlyRoute = publicOnlyRoutes.includes(pathname);
  const isRootPath = pathname === "/";
  
  // Hide navbar on public-only routes or on root path when not authenticated
  const hideNavbar = isPublicOnlyRoute || (isRootPath && !user);
  
  if (hideNavbar) return null;
  
  return <Navbar />;
} 