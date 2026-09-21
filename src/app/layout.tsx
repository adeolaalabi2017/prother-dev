import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/prother/auth-provider";
import { ScrollProgress } from "@/components/prother/scroll-progress";
import { SiteHeader } from "@/components/prother/site-header";
import { SiteFooter } from "@/components/prother/site-footer";
import { ToolExplorer } from "@/components/prother/tool-explorer";
import { SubmitWizard } from "@/components/prother/submit-wizard";
import { StatusTracker } from "@/components/prother/status-tracker";
import { EditorConsole } from "@/components/prother/editor-console";
import { CompareTray } from "@/components/prother/compare-tray";
import { DeepLinkHost } from "@/components/prother/deep-link-host";
import { CollectionsMineFullPage } from "@/components/prother/collections-mine-full-page";
import { SavedFullPage } from "@/components/prother/saved-full-page";
import { CollectionFullPage } from "@/components/prother/collection-full-page";
import { CategoryFullPage } from "@/components/prother/category-full-page";
import { LaunchesFullPage } from "@/components/prother/launches-full-page";
import { CompareFullPage } from "@/components/prother/compare-full-page";
import { PostFullPage } from "@/components/prother/post-full-page";
import { ToolFullPage } from "@/components/prother/tool-full-page";
import { BackToTop } from "@/components/prother/back-to-top";

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

/**
 * Shared chrome — header, footer, overlays, and the full-page deep-link
 * stack live here so every dedicated route (/tools, /journal, /about,
 * /submit) gets the same shell. Stack order matters: later components
 * render on top (higher in DOM).
 */
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
        <AuthProvider>
          <div className="flex min-h-screen flex-col overflow-x-clip bg-ink text-foreground">
            <ScrollProgress />
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <ToolExplorer />
            <SubmitWizard />
            <StatusTracker />
            <EditorConsole />
            <CompareTray />
            <DeepLinkHost />
            {/* Full-page deep-link stack — each renders null when closed */}
            <CollectionsMineFullPage />
            <SavedFullPage />
            <CollectionFullPage />
            <CategoryFullPage />
            <LaunchesFullPage />
            <CompareFullPage />
            <PostFullPage />
            <ToolFullPage />
            <BackToTop />
          </div>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
