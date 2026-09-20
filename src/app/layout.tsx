import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "Prother — Where AI products get discovered",
  description:
    "Discover every new AI tool the day it launches. A fresh batch of AI products daily — upvote, review, compare, and never miss the one that changes how you work.",
  keywords: [
    "Prother",
    "AI launches",
    "AI tools",
    "product launch",
    "daily feed",
    "AI products",
  ],
  openGraph: {
    title: "Prother — Where AI products get discovered",
    description:
      "Discover every new AI tool the day it launches. A fresh batch of AI products daily — upvote, review, compare, and never miss the one that changes how you work.",
    siteName: "Prother",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prother — Where AI products get discovered",
    description:
      "Discover every new AI tool the day it launches. A fresh batch of AI products daily — upvote, review, compare, and never miss the one that changes how you work.",
    images: ["/api/og"],
  },
  alternates: {
    types: { "application/rss+xml": "/api/rss" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
