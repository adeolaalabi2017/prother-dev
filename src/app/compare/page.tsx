import type { Metadata } from "next";
import { db } from "@/lib/prother";
import { clamp } from "@/lib/og";
import { buildCompareMatrix } from "@/lib/compare";
import type { CompareMatrix } from "@/lib/compare";
import { CompareMatrixView } from "@/components/prother/compare-matrix";

/**
 * /compare — category-scoped feature comparison (Task 32).
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

/** Deduped, trimmed tool slugs (max 4 — mirrors MAX_COMPARE_TOOLS). */
function toolSlugsFrom(raw: string): string[] {
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 4);
}

// ── Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const category = firstParam(sp.category).trim();
  const toolSlugs = toolSlugsFrom(firstParam(sp.tools));

  let title = "Compare AI tools by category | Prother";
  let description =
    "Pick a category, choose 2 to 4 AI tools, and see pricing, ratings, API access, and the features that matter side by side.";

  if (category) {
    const cat = await db.category.findUnique({
      where: { slug: category },
      select: { name: true, _count: { select: { tools: { where: { status: "live" } } } } },
    });
    if (cat) {
      title = `${cat.name}: compare AI tools | Prother`;
      const n = cat._count.tools;
      description = `Compare ${n} ${cat.name} tools side by side: pricing, ratings, API access, and the features that matter for this category.`;

      // Head-to-head deep link: name both tools when exactly two resolve.
      if (toolSlugs.length === 2) {
        const found = await db.tool.findMany({
          where: { slug: { in: toolSlugs }, status: "live" },
          select: { slug: true, name: true },
        });
        if (found.length === 2) {
          const names = toolSlugs.map((s) => found.find((f) => f.slug === s)?.name);
          if (names[0] && names[1]) {
            title = `${names[0]} vs ${names[1]} · Feature comparison | Prother`;
            description = `Compare ${names[0]} and ${names[1]} side by side: pricing, ratings, API access, and the ${cat.name} features that matter.`;
          }
        }
      }
    }
  }

  const finalDescription = clamp(description, 200);

  return {
    title,
    description: finalDescription,
    keywords: ["compare AI tools", "AI tool comparison", "AI tools directory", "AI tools"],
    alternates: {
      canonical: category
        ? `/compare?category=${encodeURIComponent(category)}`
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

export default async function ComparePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const category = firstParam(sp.category).trim();
  const requestedTools = toolSlugsFrom(firstParam(sp.tools));

  let categories: { slug: string; name: string; emoji: string; toolCount: number }[] = [];
  try {
    const rows = await db.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        slug: true,
        name: true,
        emoji: true,
        _count: { select: { tools: { where: { status: "live" } } } },
      },
    });
    categories = rows.map((c) => ({
      slug: c.slug,
      name: c.name,
      emoji: c.emoji,
      toolCount: c._count.tools,
    }));
  } catch {
    categories = [];
  }

  let initialMatrix: CompareMatrix | null = null;
  let initialTools: string[] = [];
  if (category) {
    try {
      const matrix = await buildCompareMatrix(category, requestedTools);
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
          initialMatrix = (await buildCompareMatrix(category, initialTools)) ?? matrix;
        }
      }
    } catch {
      initialMatrix = null;
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
          <h1 className="mt-3 text-4xl font-black tracking-tighter text-white sm:text-5xl">
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
