import type { Metadata } from "next";
import Link from "next/link";
import { clamp } from "@/lib/og";
import type { CompareMatrix } from "@/lib/compare";
import { CompareMatrixView } from "@/components/prother/compare-matrix";
import { CATEGORIES } from "@/components/prother/categories";
import { POPULAR_SHOWDOWNS } from "@/lib/showdowns";
import { ToolLogo } from "@/components/prother/tool-logo";
import { createServerConvexClient } from "@/lib/convex";
import {
  shadowCompareCategories,
  shadowCompareMatrix,
  shadowToolPageData,
} from "@/lib/data";

/**
 * /compare - category-scoped feature comparison (Task 32).
 *
 * SEO-friendly full page: the matrix for ?category=&tools= is built on the
 * server (shared builder lib/compare.ts, same shape as GET /api/compare/matrix)
 * so first paint carries the full table, while <CompareMatrixView> owns the
 * picker/chips/URL-sync interactivity client-side. When a landing URL has no
 * tools param, the top 2 live options of the category are auto-selected
 * server-side (featured-first) so the page is instantly useful; the client
 * mirrors that selection into the address bar on mount.
 */

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** Deduped, trimmed tool slugs (max 4: mirrors MAX_COMPARE_TOOLS). */
function toolSlugsFrom(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].slice(0, 4);
}

// ── Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const category = firstParam(sp.category).trim();
  const toolSlugs = toolSlugsFrom(firstParam(sp.tools));

  let title = "Compare AI tools by category | Prother";
  let description =
    "Pick a category, choose 2 to 4 AI tools, and see pricing, ratings, API access, and the features that matter side by side.";

  if (category) {
    // Convex-only (compare cutover): category name + live count from the
    // categories list; head-to-head names from the matrix rows.
    const client = createServerConvexClient()!;
    const cats = await shadowCompareCategories(client).catch(() => []);
    const cat = cats.find((c) => c.slug === category);
    if (cat) {
      title = `${cat.name}: compare AI tools | Prother`;
      const n = cat.toolCount;
      description = `Compare ${n} ${cat.name} tools side by side: pricing, ratings, API access, and the features that matter for this category.`;

      // Head-to-head deep link: name both tools when exactly two resolve.
      if (toolSlugs.length === 2) {
        const matrix = await shadowCompareMatrix(
          client,
          category,
          toolSlugs,
        ).catch(() => null);
        const rows =
          matrix && !("error" in matrix)
            ? toolSlugs.map((s) => matrix.tools.find((t) => t.slug === s)?.name)
            : [];
        if (rows[0] && rows[1]) {
          title = `${rows[0]} vs ${rows[1]} · Feature comparison | Prother`;
          description = `Compare ${rows[0]} and ${rows[1]} side by side: pricing, ratings, API access, and the ${cat.name} features that matter.`;
        }
      }
    }
  }

  const finalDescription = clamp(description, 200);

  return {
    title,
    description: finalDescription,
    keywords: [
      "compare AI tools",
      "AI tool comparison",
      "AI tools directory",
      "AI tools",
    ],
    alternates: {
      canonical:
        category && toolSlugs.length === 2
          ? `/compare/${[...toolSlugs].sort().join("-vs-")}`
          : category
            ? `/compare/${encodeURIComponent(category)}`
            : "/compare",
    },
    openGraph: {
      title,
      description: finalDescription,
      siteName: "Prother",
      type: "website",
      images: [{ url: "/api/og", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: finalDescription,
      images: ["/api/og"],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────

/** Convex-only categories (never throws: [] on failure). */
async function getCategories(): Promise<
  { slug: string; name: string; emoji: string; toolCount: number }[]
> {
  try {
    return await shadowCompareCategories(createServerConvexClient()!);
  } catch {
    return [];
  }
}

/** Convex-only matrix (null on failure / unknown category). */
async function getMatrix(
  category: string,
  slugs: string[],
): Promise<CompareMatrix | null> {
  try {
    const res = await shadowCompareMatrix(
      createServerConvexClient()!,
      category,
      slugs,
    );
    if (!("error" in res)) return res as CompareMatrix;
  } catch {
    // fall through to null
  }
  return null;
}

export default async function ComparePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  let category = firstParam(sp.category).trim();
  const requestedTools = toolSlugsFrom(firstParam(sp.tools));

  if (!category && requestedTools.length > 0) {
    try {
      const client = createServerConvexClient()!;
      const data = await shadowToolPageData(client, requestedTools[0]!);
      if (data && !("error" in data) && data.tool?.category?.slug) {
        category = data.tool.category.slug;
      }
    } catch {
      // best-effort category resolution from first requested tool
    }
  }

  let categories: {
    slug: string;
    name: string;
    emoji: string;
    toolCount: number;
  }[] = [];
  // The static CATEGORIES list defines which landing pages exist; Convex only
  // supplies live tool counts. Without this merge a category whose count query
  // comes back short silently loses its /compare/<slug> page and its sitemap
  // entry. See src/app/compare/[category]/page.tsx for the same helper.
  const liveCats = await getCategories();
  const byslug = new Map(liveCats.map((c) => [c.slug, c]));
  categories = CATEGORIES.map(
    (c) =>
      byslug.get(c.slug) ?? {
        slug: c.slug,
        name: c.name,
        emoji: c.emoji,
        toolCount: 0,
      },
  );

  let initialMatrix: CompareMatrix | null = null;
  let initialTools: string[] = [];
  if (category) {
    const matrix = await getMatrix(category, requestedTools);
    if (matrix) {
      initialMatrix = matrix;
      initialTools = requestedTools;
      // No explicit tools in the URL: feature the top 2 live options
      // (featured-first) so the matrix paints fully formed.
      if (
        requestedTools.length === 0 &&
        matrix.tools.length === 0 &&
        matrix.options.length >= 2
      ) {
        initialTools = matrix.options.slice(0, 2).map((o) => o.slug);
        initialMatrix = (await getMatrix(category, initialTools)) ?? matrix;
      }
    }
  }

  const unknownCategory = category !== "" && initialMatrix === null;

  return (
    <div className="bg-ink pb-16 text-white md:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <header>
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-white/60">
            <span aria-hidden className="h-px w-6 bg-ember" />
            Compare
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tighter text-white sm:text-5xl">
            Compare AI tools by <span className="text-ember">feature.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
            Pick a category, choose 2 to 4 tools, and see how they differ on the
            features that matter.
          </p>
        </header>

        {unknownCategory && (
          <p className="mt-8 rounded-xl border border-ember/30 bg-ember/[0.06] p-4 text-sm text-white/80">
            We couldn&apos;t find that category (it may have been renamed or
            removed). Pick one below to start a comparison.
          </p>
        )}

        {/* Landing state: no ?category= yet, so the matrix above is an empty
            shell. These real links give crawlers (and no-JS visitors) a way
            into the eight indexable per-category comparison pages. */}
        {!initialMatrix && categories.length > 0 && (
          <nav aria-label="Compare by category" className="mt-10">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-white/60">
              Start a comparison by category
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/compare/${c.slug}`}
                    className="group flex h-full flex-col justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-ember/40 hover:bg-white/[0.05]"
                  >
                    <span className="flex items-center gap-2 text-base font-semibold text-white transition-colors group-hover:text-ember">
                      {c.name}
                    </span>
                    <span className="font-mono text-xs text-white/55">
                      {c.toolCount} tools
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Popular Head-to-Head Showdowns */}
        {!initialMatrix && (
          <section aria-label="Popular Head-to-Head Showdowns" className="mt-14">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.25em] text-ember font-semibold">
                  HEAD-TO-HEAD SHOWDOWNS
                </div>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Popular side-by-side comparisons
                </h2>
              </div>
              <span className="font-mono text-xs text-white/45">
                {POPULAR_SHOWDOWNS.length} curated matchups
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {POPULAR_SHOWDOWNS.map((s) => (
                <Link
                  key={s.slug}
                  href={`/compare/${s.slug}`}
                  className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-[#0c0d10] p-4 transition-all duration-200 hover:border-ember/40 hover:bg-white/[0.035] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                >
                  <div className="flex items-center justify-between font-mono text-[10px] tracking-wider text-white/45 uppercase">
                    <span>{s.categoryName}</span>
                    <span className="font-semibold text-ember">VS</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <ToolLogo slug={s.toolA} name={s.toolA} size="sm" />
                      <span className="truncate text-sm font-semibold text-white">
                        {s.title.split(" vs ")[0]}
                      </span>
                    </div>

                    <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-white/70">
                      VS
                    </span>

                    <div className="flex min-w-0 items-center justify-end gap-2.5 text-right">
                      <span className="truncate text-sm font-semibold text-white">
                        {s.title.split(" vs ")[1]}
                      </span>
                      <ToolLogo slug={s.toolB} name={s.toolB} size="sm" />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-white/50">
                    <span>Full feature diff & specs</span>
                    <span className="font-mono text-ember transition-transform group-hover:translate-x-0.5">
                      &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10">
          <CompareMatrixView
            categories={categories}
            initialMatrix={initialMatrix}
            initialCategory={initialMatrix ? category : ""}
            initialTools={initialMatrix ? initialTools : []}
          />
        </div>
      </div>
    </div>
  );
}
