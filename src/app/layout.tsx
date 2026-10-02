import type { Metadata } from "next";
import { ThemeProvider } from "@/components/prother/theme-provider";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/prother/auth-provider";
import { ConvexClientProvider } from "@/components/prother/convex-provider";
import { ScrollProgress } from "@/components/prother/scroll-progress";
import { SiteHeader } from "@/components/prother/site-header";
import { SiteFooter } from "@/components/prother/site-footer";
import { GlobalOverlays } from "@/components/prother/global-overlays";
import { AnalyticsPing } from "@/components/prother/analytics-ping";
import { siteUrl } from "@/lib/site-url";
import { createServerConvexClient } from "@/lib/convex";
import { shadowSite } from "@/lib/data";

/**
 * Typography: the SF Pro family. SF Pro is Apple's system font, so instead of
 * a webfont download we point --font-sans (globals.css @theme) at the native
 * SF Pro stack: Apple devices render SF Pro Display/Text, other platforms get
 * their tuned system equivalent.
 *
 * The tradeoff, stated plainly: the display type uses weight 900 with negative
 * tracking, which only resolves as designed on SF Pro. Stacks that top out at
 * 700 synthesize the extra weight, and tight tracking looks loose on wider
 * faces. That is accepted for a zero-download, zero-CLS font strategy, and the
 * fallback chain in globals.css is ordered to minimise the gap. If a webfont
 * is ever worth the request, `next/font/google` is already available and
 * Inter is the closest free match to SF Pro's metrics.
 */

/**
 * Root metadata reads the CMS-managed SEO defaults (SiteSetting KV, Task 32)
 * with the locked copy as fallback, so the Admin Console can retune the site's
 * default unfurl without a deploy. Page-level generateMetadata overrides.
 */
export async function generateMetadata(): Promise<Metadata> {
  let title = "Prother · Find the right AI tool";
  let description =
    "Search and discovery for AI products and tools. A curated directory of conversational AI, generative tools, NLP utilities, computer vision, analytics, automation, and developer platforms, with honest pricing and real reviews.";
  let faviconUrl = "";
  // Convex-only (site settings cutover). Metadata must never 500 the shell:
  // a failed settings read falls back to the locked defaults below.
  let map: Record<string, string> | null = null;
  try {
    map = (await shadowSite(createServerConvexClient()!)).settings;
  } catch {
    map = null;
  }
  if (map) {
    if (map["seo.defaultTitle"]) title = map["seo.defaultTitle"];
    if (map["seo.defaultDescription"])
      description = map["seo.defaultDescription"];
    faviconUrl = map["branding.faviconUrl"] ?? "";
  }

  return {
    metadataBase: new URL(
      // Same fallback as robots.ts/sitemap.ts — a mismatched default would put
      // localhost into every og:image/canonical URL in production.
      siteUrl(),
    ),
    title,
    description,
    keywords: [
      "Prother",
      "AI tools",
      "AI tools directory",
      "AI tools search",
      "best AI tools",
      "AI products",
      "find AI tools",
    ],
    openGraph: {
      title,
      description,
      siteName: "Prother",
      type: "website",
      images: [{ url: "/api/og", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/api/og"],
    },
    alternates: {
      types: { "application/rss+xml": "/api/rss" },
    },
    icons: faviconUrl
      ? [{ url: faviconUrl }]
      : [
          { url: "/favicon.ico", sizes: "32x32" },
          { url: "/icon.png", sizes: "32x32", type: "image/png" },
          { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        ],
  };
}

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
      <body className="antialiased bg-background text-foreground">
        {/* Dark is the brand default; the header toggle flips to the warm
            paper light theme (globals.css html.light token remap). The
            class is set pre-hydration by our inline theme script, so
            there is no first-paint flash. */}
        <ThemeProvider>
          <AuthProvider>
            <ConvexClientProvider>
              <div className="flex min-h-screen flex-col overflow-x-clip bg-ink text-foreground">
                <ScrollProgress />
                <SiteHeader />
                <main className="flex-1">{children}</main>
                <SiteFooter />
                <GlobalOverlays />
                {/* First-party, cookieless pageview ping (Task 28) - renders null */}
                <AnalyticsPing />
              </div>
            </ConvexClientProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
