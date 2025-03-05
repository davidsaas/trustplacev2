"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";

export function NavWrapper() {
  const pathname = usePathname();
  
  // Only show navbar on authenticated routes
  const showNavbar = pathname !== "/" && 
                     pathname !== "/login" && 
                     pathname !== "/register";
  
  if (!showNavbar) return null;
  
  return <Navbar />;
} 