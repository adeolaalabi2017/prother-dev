import { db } from "@/lib/prother";

export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * GET /api/rss — RSS 2.0 feed, journal-only since the directory
 * repositioning (launch feeds removed). The default and the explicit
 * ?kind=journal both serve published journal posts.
 */
export async function GET(req: Request) {
  const kind = new URL(req.url).searchParams.get("kind");
  return journalFeed(req, kind === "journal");
}

/** Journal (blog) RSS feed — items link to the real /journal/[slug] routes. */
async function journalFeed(req: Request, explicitKind: boolean) {
  const posts = await db.post.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });

  const origin = new URL(req.url).origin;

  const items = posts
    .map((p) => {
      // Real article route — the legacy /?post= overlay canonicalizes here.
      const link = `${origin}/journal/${encodeURIComponent(p.slug)}`;
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="false">${esc(`prother-post-${p.slug}`)}</guid>
      <pubDate>${(p.publishedAt ?? p.updatedAt).toUTCString()}</pubDate>
      <description>${esc(p.excerpt)}</description>
      <category>${esc(p.category)}</category>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Prother Journal — AI tool discovery</title>
    <link>${esc(origin)}</link>
    <description>Notes on finding, comparing, and choosing AI tools — reviews, directories, and ecosystem data from the Prother Journal.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>1440</ttl>
    <atom:link href="${esc(`${origin}/api/rss${explicitKind ? "?kind=journal" : ""}`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
