import type { Metadata } from "next";
import { ToolsDirectory } from "@/components/prother/tools-directory";
import { AdSlot } from "@/components/prother/ad-slot";
import type { DirectoryRow } from "@/app/api/tools/route";
import { placementEnabled } from "@/lib/ad-config";
import { createServerConvexClient } from "@/lib/convex";
import { shadowToolsDirectory } from "@/lib/data";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { DEFAULT_TOOLS_METADATA } from "../../tools-live/default-metadata";

/**
 * Internal route behind plain /tools (see rewrites in next.config.ts).
 * Unfiltered directory: no searchParams, so it can be ISR. Requests with
 * q, tag, pricing, sort or page go to /tools-live instead.
 *
 * Why a dynamic segment: with generateStaticParams returning [] nothing is
 * prerendered at build (the build has no D1 binding, so it would bake an empty
 * list). The page renders on first request, then caches in the R2 incremental
 * cache (open-next.config.ts) and regenerates in the background.
 */
export const revalidate = 300;

export async function generateStaticParams() {
  return [];
}

export const metadata: Metadata = DEFAULT_TOOLS_METADATA;

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";
/** Matches the client directory's PAGE_LIMIT. */
const DIRECTORY_PAGE_LIMIT = 48;

export default async function ToolsDefaultPage() {
  const directoryBannerOn = await placementEnabled("directory_banner");
  const res = await shadowToolsDirectory(createServerConvexClient(), {
    categorySlug: null,
    q: null,
    pricing: null,
    tag: null,
    sort: "featured",
    page: 1,
    pageSize: DIRECTORY_PAGE_LIMIT,
  });
  if ("error" in res) throw new Error(res.error);
  const rows = res.rows as DirectoryRow[];

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AI tools on Prother",
    description:
      "The curated directory of AI tools: search, compare, and save your stack.",
    numberOfItems: rows.length,
    itemListElement: rows.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      url: `${SITE_BASE}/tools/${t.slug}`,
    })),
  };

  return (
    <div className="pb-16 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }}
      />
      <ToolsDirectory
        initialRows={rows}
        initialTotal={res.total}
        initialSort="featured"
        sponsorSlot={
          directoryBannerOn ? (
            <AdSlot placement="directory_banner" variant="bar" />
          ) : undefined
        }
      />
    </div>
  );
}
