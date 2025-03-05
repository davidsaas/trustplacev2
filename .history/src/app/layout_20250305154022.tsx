"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  
  // Only show navbar on authenticated routes
  const showNavbar = pathname !== "/" && 
                     pathname !== "/login" && 
                     pathname !== "/register";
  
  return (
    <html lang="en">
      <body className={inter.className}>
        {showNavbar && <Navbar />}
        {children}
      </body>
    </html>
  );
}
