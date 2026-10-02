import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompareMatrixView } from "@/components/prother/compare-matrix";
import { CATEGORIES } from "@/components/prother/categories";
import type { CompareMatrix } from "@/lib/compare";
import { createServerConvexClient } from "@/lib/convex";
import { shadowCompareCategories, shadowCompareMatrix } from "@/lib/data";

/**
 * /compare/[category] — the indexable per-category comparison page.
 *
 * /compare itself is a picker: with no ?category= it renders an empty matrix
 * shell, which is a thin page for a high-intent keyword. This route gives each
 * of the eight categories a real landing URL ("/compare/ai-models") whose
 * server HTML contains the full comparison table, so crawlers and no-JS
 * visitors get the content instead of an empty <div>.
 *
 * With no explicit tool selection the top 2 live options in the category are
 * featured server-side, so the page is useful on arrival; the client
 * <CompareMatrixView> then owns the picker and URL sync.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ category: string }> };
type Category = {
  slug: string;
  name: string;
  emoji: string;
  toolCount: number;
};

/** Convex-only categories (never throws — [] on failure). */
async function getCategories(): Promise<Category[]> {
  try {
    return await shadowCompareCategories(createServerConvexClient()!);
  } catch {
    return [];
  }
}

/**
 * Every category that has a landing page. The static CATEGORIES constant is
 * the source of truth for which slugs exist; the Convex list only supplies
 * live tool counts. Merging means a category is never missing from the
 * sitemap/landing links just because a count query came back short, and an
 * unknown slug still 404s (it is in neither list).
 */
function mergeCategories(live: Category[]): Category[] {
  const byslug = new Map(live.map((c) => [c.slug, c]));
  return CATEGORIES.map(
    (c) =>
      byslug.get(c.slug) ?? {
        slug: c.slug,
        name: c.name,
        emoji: c.emoji,
        toolCount: 0,
      },
  );
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

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const cats = mergeCategories(await getCategories());
  const cat = cats.find((c) => c.slug === category);
  if (!cat) {
    return { title: "Compare AI tools | Prother", robots: { index: false } };
  }
  const title = `${cat.name}: compare AI tools | Prother`;
  const description = `Compare ${cat.toolCount} ${cat.name} tools side by side: pricing, ratings, API access, and the features that matter for this category.`;
  const og = `/api/og?category=${encodeURIComponent(cat.slug)}&compare=1`;
  return {
    title,
    description,
    alternates: { canonical: `/compare/${cat.slug}` },
    openGraph: {
      title,
      description,
      siteName: "Prother",
      type: "website",
      images: [{ url: og, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  };
}

export default async function CompareCategoryPage({ params }: Params) {
  const { category } = await params;
  const cats = mergeCategories(await getCategories());
  const cat = cats.find((c) => c.slug === category);
  if (!cat) notFound();

  let initialMatrix: CompareMatrix | null = await getMatrix(category, []);
  let initialTools: string[] = [];

  // No explicit selection: feature the top 2 live options so the page paints
  // a complete table instead of an empty shell.
  if (
    initialMatrix &&
    initialMatrix.tools.length === 0 &&
    initialMatrix.options.length >= 2
  ) {
    initialTools = initialMatrix.options.slice(0, 2).map((o) => o.slug);
    initialMatrix = (await getMatrix(category, initialTools)) ?? initialMatrix;
  }

  return (
    <div className="bg-ink pb-16 text-white md:pb-0">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <header>
          <nav aria-label="Breadcrumb" className="mb-4">
            <a
              href="/compare"
              className="font-mono text-xs uppercase tracking-[0.25em] text-white/55 transition-colors hover:text-ember"
            >
              ← All categories
            </a>
          </nav>
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-white/60">
            <span aria-hidden className="h-px w-6 bg-ember" />
            Compare
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tighter text-white sm:text-5xl">
            <span aria-hidden>{cat.emoji}</span> {cat.name}{" "}
            <span className="text-ember">tools compared.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
            {cat.toolCount} {cat.name} tools side by side — pricing, API access,
            and the features that matter. Add or remove tools to update the
            table.
          </p>
        </header>

        <div className="mt-10">
          <CompareMatrixView
            categories={cats}
            initialMatrix={initialMatrix}
            initialCategory={cat.slug}
            initialTools={initialTools}
          />
        </div>
      </div>
    </div>
  );
}
