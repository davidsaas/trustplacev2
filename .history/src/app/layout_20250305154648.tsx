import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import type { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TrustPlace - Safe Airbnb Stays",
  description: "Find safe and trusted Airbnb stays with TrustPlace",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
