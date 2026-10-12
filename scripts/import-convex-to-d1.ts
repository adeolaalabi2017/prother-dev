/**
 * One-time import: Convex snapshot (documents.jsonl per table) -> D1 SQL.
 * Usage: bun scripts/import-convex-to-d1.ts /tmp/opencode/prother-export/snapshot /tmp/opencode/prother-export/import.sql
 * Then: bunx wrangler d1 execute prother --remote --file=<import.sql>
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const [snapDir, outPath] = process.argv.slice(2);
if (!snapDir || !outPath) {
  console.error("usage: bun scripts/import-convex-to-d1.ts <snapshotDir> <out.sql>");
  process.exit(1);
}

function sqlStr(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(Math.trunc(v)) : "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "object") return sqlStr(JSON.stringify(v));
  return "'" + String(v).replace(/'/g, "''") + "'";
}
function num(v: unknown, dflt = 0): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(Math.trunc(v));
  if (typeof v === "boolean") return v ? "1" : "0";
  return String(dflt);
}
function bool(v: unknown): string {
  return v ? "1" : "0";
}
function json(v: unknown): string {
  if (v === undefined || v === null) return "'[]'";
  return sqlStr(typeof v === "string" ? v : JSON.stringify(v));
}
function jsonObj(v: unknown): string {
  if (v === undefined || v === null) return "'{}'";
  return sqlStr(typeof v === "string" ? v : JSON.stringify(v));
}
function txt(v: unknown): string {
  if (v === undefined || v === null) return "NULL";
  return sqlStr(String(v));
}

function load(table: string): Record<string, any>[] {
  const p = join(snapDir, table, "documents.jsonl");
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, "utf8").trim();
  if (!raw) return [];
  return raw.split("\n").map((l) => JSON.parse(l));
}

const out: string[] = ["PRAGMA foreign_keys=OFF;", "BEGIN TRANSACTION;"];
let total = 0;
function insert(table: string, cols: string[], rows: string[][]) {
  for (const r of rows) {
    out.push(`INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${r.join(", ")});`);
    total++;
  }
}

// categories (8)
insert(
  "categories",
  ["id", "slug", "name", "emoji", "sort_order", "features_json", "legacy_id"],
  load("categories").map((d) => [
    sqlStr(d._id), txt(d.slug), txt(d.name), txt(d.emoji), num(d.sortOrder),
    d.features ? json(d.features) : "'[]'", txt(d.legacyId),
  ]),
);

// tools (150)
insert(
  "tools",
  ["id","slug","name","tagline","description","website_url","logo_emoji","logo_gradient","logo_url",
   "screenshot_urls_json","long_description","use_cases_json","pros_json","cons_json","alternatives_json",
   "pricing_checked_at","content_updated_at","pricing_model","starting_price","pricing_note","has_api",
   "github_url","docs_url","twitter_url","tags_json","features_json","maker_email","track","editors_pick",
   "curated","claimed","maker_handle","status","pinned","verified_at","category_id","submission_id",
   "comment_count","review_count","rating_sum_x100","legacy_id","created_at"],
  load("tools").map((d) => [
    sqlStr(d._id), txt(d.slug), txt(d.name), txt(d.tagline), txt(d.description),
    txt(d.websiteUrl), txt(d.logoEmoji), txt(d.logoGradient), txt(d.logoUrl),
    json(d.screenshotUrls), txt(d.longDescription), json(d.useCases), json(d.pros), json(d.cons), json(d.alternatives),
    d.pricingCheckedAt ? num(d.pricingCheckedAt) : "NULL",
    d.contentUpdatedAt ? num(d.contentUpdatedAt) : "NULL",
    txt(d.pricingModel), txt(d.startingPrice), txt(d.pricingNote), bool(d.hasApi),
    txt(d.githubUrl), txt(d.docsUrl), txt(d.twitterUrl), json(d.tags), jsonObj(d.features),
    txt(d.makerEmail), txt(d.track), bool(d.editorsPick), bool(d.curated), bool(d.claimed),
    txt(d.makerHandle), txt(d.status), num(d.pinned),
    d.verifiedAt ? num(d.verifiedAt) : "NULL",
    txt(typeof d.categoryId === "object" ? d.categoryId?.$id ?? d.categoryId : d.categoryId),
    txt(typeof d.submissionId === "object" ? d.submissionId?.$id ?? null : (d.submissionId ?? null)),
    num(d.commentCount), num(d.reviewCount), num(d.ratingSumX100), txt(d.legacyId), num(d.createdAt),
  ]),
);

// posts (9)
insert(
  "posts",
  ["id","slug","title","excerpt","body","cover_emoji","cover_gradient","cover_url","category","tags_json",
   "status","author","reading_minutes","views","seo_title","seo_description","keywords","published_at",
   "legacy_id","created_at","updated_at"],
  load("posts").map((d) => [
    sqlStr(d._id), txt(d.slug), txt(d.title), txt(d.excerpt), txt(d.body),
    txt(d.coverEmoji), txt(d.coverGradient), txt(d.coverUrl), txt(d.category), json(d.tags),
    txt(d.status), txt(d.author), num(d.readingMinutes), num(d.views),
    txt(d.seoTitle), txt(d.seoDescription), txt(d.keywords),
    d.publishedAt ? num(d.publishedAt) : "NULL",
    txt(d.legacyId), num(d.createdAt), num(d.updatedAt),
  ]),
);

// site_settings (17)
insert(
  "site_settings", ["id","key","value","updated_at"],
  load("siteSettings").map((d) => [sqlStr(d._id), txt(d.key), txt(d.value), d.updatedAt ? num(d.updatedAt) : "NULL"]),
);

// users (1)
insert(
  "users",
  ["id","email","name","handle","image","bio","cover_image","role","status","email_verified","external_auth_id","legacy_id","created_at"],
  load("users").map((d) => [
    sqlStr(d._id), txt(d.email), txt(d.name), txt(d.handle), txt(d.image), txt(d.bio),
    txt(d.coverImage), txt(d.role ?? "member"), txt(d.status ?? "active"),
    d.emailVerified ? num(d.emailVerified) : "NULL", txt(d.externalAuthId), txt(d.legacyId), num(d.createdAt),
  ]),
);

// page_view_daily (66)
insert(
  "page_view_daily", ["id","path","day","views","updated_at"],
  load("pageViewDaily").map((d, i) => [
    sqlStr(d._id ?? `pv-${d.path}-${d.day}-${i}`), txt(d.path), txt(d.day), num(d.views), num(d.updatedAt),
  ]),
);

// ad_serve_stats (10)
insert(
  "ad_serve_stats", ["id","placement","day","served","house","unfilled","created_at","updated_at"],
  load("adServeStats").map((d, i) => [
    sqlStr(d._id ?? `ads-${d.placement}-${d.day}-${i}`), txt(d.placement), txt(d.day),
    num(d.served), num(d.house), num(d.unfilled), num(d.createdAt), num(d.updatedAt),
  ]),
);

// comparisons (143)
insert(
  "comparisons", ["id","a_slug","b_slug","views","created_at"],
  load("comparisons").map((d, i) => [
    sqlStr(d._id ?? `cmp-${i}`), txt(d.aSlug), txt(d.bSlug), num(d.views), num(d.createdAt),
  ]),
);

// audit_logs (301)
insert(
  "audit_logs", ["id","action","entity","entity_id","meta","actor","legacy_id","created_at"],
  load("auditLogs").map((d, i) => [
    sqlStr(d._id ?? `audit-${i}`), txt(d.action), txt(d.entity), txt(d.entityId),
    typeof d.meta === "string" ? sqlStr(d.meta) : jsonObj(d.meta), txt(d.actor), txt(d.legacyId), num(d.createdAt),
  ]),
);

// submissions (2)
insert(
  "submissions",
  ["id","email","website_url","domain","name","tagline","description","category_slug","tags_json","pricing_model",
   "starting_price","pricing_note","has_api","github_url","docs_url","twitter_url","logo_emoji","logo_gradient",
   "is_owner","confirmed_live","agreed_standards","status","review_note","legacy_id","created_at"],
  load("submissions").map((d) => [
    sqlStr(d._id), txt(d.email), txt(d.websiteUrl), txt(d.domain), txt(d.name), txt(d.tagline),
    txt(d.description), txt(d.categorySlug), json(d.tags), txt(d.pricingModel), txt(d.startingPrice),
    txt(d.pricingNote), bool(d.hasApi), txt(d.githubUrl), txt(d.docsUrl), txt(d.twitterUrl),
    txt(d.logoEmoji), txt(d.logoGradient), bool(d.isOwner), bool(d.confirmedLive), bool(d.agreedStandards),
    txt(d.status), txt(d.reviewNote), txt(d.legacyId), num(d.createdAt),
  ]),
);

// reports (10)
insert(
  "reports",
  ["id","reporter_email","reporter_key","target_type","target_id","target_label","reason","details","status",
   "resolution_note","resolved_at","legacy_id","created_at"],
  load("reports").map((d, i) => [
    sqlStr(d._id ?? `rep-${i}`), txt(d.reporterEmail), txt(d.reporterKey), txt(d.targetType),
    txt(d.targetId), txt(d.targetLabel), txt(d.reason), txt(d.details), txt(d.status),
    txt(d.resolutionNote), d.resolvedAt ? num(d.resolvedAt) : "NULL", txt(d.legacyId), num(d.createdAt),
  ]),
);

// media (14) - storageKey stays NULL until R2 enabled; storedName preserved
insert(
  "media",
  ["id","storage_key","kind","mime_type","size","original_name","stored_name","width","height","purpose","owner_key","legacy_id","created_at"],
  load("media").map((d) => [
    sqlStr(d._id), "NULL", txt(d.kind), txt(d.mimeType), num(d.size), txt(d.originalName),
    txt(d.storedName), d.width ? num(d.width) : "NULL", d.height ? num(d.height) : "NULL",
    txt(d.purpose), txt(d.ownerKey), txt(d.legacyId), num(d.createdAt),
  ]),
);

// auth tables
insert(
  "auth_accounts",
  ["id","user_legacy_id","type","provider","provider_account_id","refresh_token","access_token","expires_at","token_type","scope","id_token","session_state"],
  load("authAccounts").map((d, i) => [
    sqlStr(d._id ?? `aa-${i}`), txt(d.userLegacyId), txt(d.type), txt(d.provider), txt(d.providerAccountId),
    txt(d.refreshToken), txt(d.accessToken), d.expiresAt ? num(d.expiresAt) : "NULL",
    txt(d.tokenType), txt(d.scope), txt(d.idToken), txt(d.sessionState),
  ]),
);
insert(
  "auth_sessions", ["id","session_token","user_legacy_id","expires"],
  load("authSessions").map((d, i) => [
    sqlStr(d._id ?? `as-${i}`), txt(d.sessionToken), txt(d.userLegacyId), num(d.expires),
  ]),
);
insert(
  "auth_verification_tokens", ["id","identifier","token","expires"],
  load("authVerificationTokens").map((d, i) => [
    sqlStr(d._id ?? `av-${i}`), txt(d.identifier), txt(d.token), num(d.expires),
  ]),
);

// empty tables: bookmarks, claims, collections, collection_items, comments,
// follows, forum_replies, forum_threads, forum_thread_votes, integrations,
// reviews - schema ready, no rows to import.

out.push("COMMIT;");
writeFileSync(outPath, out.join("\n") + "\n");
console.log(`wrote ${total} inserts -> ${outPath}`);
