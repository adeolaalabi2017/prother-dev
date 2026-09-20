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

/** GET /api/rss — RSS 2.0 feed. Default: today's launches. ?kind=journal: posts. */
export async function GET(req: Request) {
  const kind = new URL(req.url).searchParams.get("kind");
  if (kind === "journal") return journalFeed(req);

  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);

  const tools = await db.tool.findMany({
    where: { launch: { scheduled: false, launchDate: { gte: todayStart, lt: tomorrowStart } } },
    include: {
      launch: { include: { _count: { select: { votes: true } } } },
      category: { select: { slug: true, name: true, emoji: true } },
    },
    orderBy: { launch: { baseUpvotes: "desc" } },
  });

  const origin = new URL(req.url).origin;
  const buildDate = now.toUTCString();

  const items = tools
    .map((t) => {
      const votes = (t.launch?.baseUpvotes ?? 0) + (t.launch?._count.votes ?? 0);
      const title = `${t.name} — ${t.tagline}`;
      const description = `${t.category.emoji} ${t.category.name} · ${t.makerHandle} · ▲ ${votes} votes${t.pricingNote ? ` · ${t.pricingNote}` : ""}`;
      const link = `${origin}/?tool=${encodeURIComponent(t.slug)}`;
      const pubDate = (t.launch?.launchDate ?? t.createdAt).toUTCString();
      return `    <item>
      <title>${esc(title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="false">${esc(`prother-launch-${t.slug}-${todayStart.toISOString().slice(0, 10)}`)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${esc(description)}</description>
      <category>${esc(t.category.name)}</category>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Prother — Where AI products get discovered</title>
    <link>${esc(origin)}</link>
    <description>Today's AI tool launches on Prother (${todayStart.toISOString().slice(0, 10)} UTC). A fresh batch every day.</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <ttl>60</ttl>
    <atom:link href="${esc(`${origin}/api/rss`)}" rel="self" type="application/rss+xml" />
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

/** Journal (blog) RSS feed — /api/rss?kind=journal. */
async function journalFeed(req: Request) {
  const posts = await db.post.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });

  const origin = new URL(req.url).origin;

  const items = posts
    .map((p) => {
      const link = `${origin}/?post=${encodeURIComponent(p.slug)}`;
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
    <title>Prother Journal — notes from the AI launch layer</title>
    <link>${esc(origin)}</link>
    <description>Launch playbooks, ranking explainers, and ecosystem data from Prother — where AI products launch.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>1440</ttl>
    <atom:link href="${esc(`${origin}/api/rss?kind=journal`)}" rel="self" type="application/rss+xml" />
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
