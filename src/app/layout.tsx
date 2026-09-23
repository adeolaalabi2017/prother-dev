import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
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
import { CompareFullPage } from "@/components/prother/compare-full-page";
import { PostFullPage } from "@/components/prother/post-full-page";
import { ToolFullPage } from "@/components/prother/tool-full-page";
import { BackToTop } from "@/components/prother/back-to-top";
import { AnalyticsPing } from "@/components/prother/analytics-ping";
import { siteUrl } from "@/lib/site-url";

/**
 * Typography: the SF Pro family. SF Pro is Apple's system font, so instead of
 * a webfont download we point --font-sans (globals.css @theme) at the native
 * SF Pro stack: Apple devices render SF Pro Display/Text, other platforms get
 * their tuned system equivalent. See globals.css --font-sans/--font-mono.
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
  try {
    const { db } = await import("@/lib/prother");
    const rows = await db.siteSetting.findMany({
      where: {
        key: {
          in: [
            "seo.defaultTitle",
            "seo.defaultDescription",
            // Branding uploads (Task 35): the favicon feeds metadata.icons
            // here; the logo is consumed client-side by the site header via
            // /api/site (useSiteSettings).
            "branding.logoUrl",
            "branding.faviconUrl",
          ],
        },
      },
      select: { key: true, value: true },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    if (map["seo.defaultTitle"]) title = map["seo.defaultTitle"];
    if (map["seo.defaultDescription"]) description = map["seo.defaultDescription"];
    faviconUrl = map["branding.faviconUrl"] ?? "";
  } catch {
    // Locked defaults hold — metadata must never 500 the shell.
  }

  return {
    metadataBase: new URL(
      // Same fallback as robots.ts/sitemap.ts — a mismatched default would put
      // localhost into every og:image/canonical URL in production.
      siteUrl()
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
    // Uploaded favicon (Task 35 branding) — replaces the default icon set
    // when the editor has configured one; no src/app/favicon.ico exists, so
    // unset keeps the previous no-icon behavior.
    ...(faviconUrl ? { icons: [{ url: faviconUrl }] } : {}),
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
            class is set pre-hydration by next-themes' inline script, so
            there is no first-paint flash. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="prother-theme"
          disableTransitionOnChange
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
            <CompareFullPage />
            <PostFullPage />
            <ToolFullPage />
            <BackToTop />
            {/* First-party, cookieless pageview ping (Task 28) — renders null */}
            <AnalyticsPing />
          </div>
        </AuthProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
