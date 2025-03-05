import { Inter } from "next/font/google";
import "./globals.css";
import { NavWrapper } from "@/components/nav-wrapper";
import type { Metadata } from "next";
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TrustPlace - Safe Airbnb Stays",
  description: "Find safe and trusted Airbnb stays with TrustPlace",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerComponentClient({ cookies });

  try {
    await supabase.auth.getSession();
  } catch (error) {
    console.error('Error getting session:', error);
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <NavWrapper />
        {children}
      </body>
    </html>
  );
}
