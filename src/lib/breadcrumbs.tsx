import Link from "next/link";

/**
 * Shared server-safe breadcrumbs (Task 25) — a plain React component (no
 * "use client", no dependencies) so it can render inside any server page.
 *
 * Renders BOTH:
 *  (a) a visible <nav aria-label="Breadcrumb"> in the site's mono
 *      uppercase micro-label language (links dim → ember on hover, the
 *      current page is plain text with aria-current="page"), and
 *  (b) one <script type="application/ld+json"> BreadcrumbList — absolute
 *      item URLs; the last crumb (current page) carries no `item`.
 *
 * Pages own their container: drop <Breadcrumbs /> inside the standard
 * `mx-auto max-w-* px-4 sm:px-6` wrapper the rest of the page uses.
 */
export type Crumb = { name: string; href?: string };

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://prother.dev";

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => {
      const isLast = i === trail.length - 1;
      return {
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
        // Only ancestors get an `item` URL — the current page has none.
        ...(crumb.href && !isLast ? { item: `${SITE_BASE}${crumb.href}` } : {}),
      };
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.2em]">
          {trail.map((crumb, i) => {
            const isLast = i === trail.length - 1;
            return (
              <li key={`${crumb.name}-${i}`} className="flex items-center gap-2">
                {isLast || !crumb.href ? (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className="text-white/85"
                  >
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-white/40 transition-colors hover:text-ember"
                  >
                    {crumb.name}
                  </Link>
                )}
                {!isLast && (
                  <span aria-hidden className="text-white/25">
                    /
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
