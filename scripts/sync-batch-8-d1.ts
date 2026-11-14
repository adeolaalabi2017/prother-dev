import { TOOLS_BATCH_8 } from "./add-daily-tools-batch-8";
import * as fs from "node:fs";

export function generateSqlFile(outPath: string) {
  function sqlVal(v: any): string {
    if (v === null || v === undefined) return "NULL";
    if (typeof v === "number") return String(v);
    return "'" + String(v).replace(/'/g, "''") + "'";
  }

  const lines: string[] = [];
  for (const t of TOOLS_BATCH_8) {
    lines.push(`DELETE FROM tools WHERE slug = '${t.slug}' OR id = '${t.id}';`);
    const cols = [
      "id",
      "slug",
      "name",
      "tagline",
      "description",
      "website_url",
      "logo_emoji",
      "logo_gradient",
      "logo_url",
      "screenshot_urls_json",
      "long_description",
      "use_cases_json",
      "pros_json",
      "cons_json",
      "alternatives_json",
      "pricing_checked_at",
      "content_updated_at",
      "pricing_model",
      "starting_price",
      "pricing_note",
      "has_api",
      "github_url",
      "docs_url",
      "twitter_url",
      "tags_json",
      "features_json",
      "maker_email",
      "track",
      "editors_pick",
      "curated",
      "claimed",
      "maker_handle",
      "status",
      "pinned",
      "verified_at",
      "category_id",
      "submission_id",
      "comment_count",
      "review_count",
      "rating_sum_x100",
      "legacy_id",
      "created_at",
    ];

    const now = Date.now();
    const vals = [
      sqlVal(t.id),
      sqlVal(t.slug),
      sqlVal(t.name),
      sqlVal(t.tagline),
      sqlVal(t.description),
      sqlVal(t.websiteUrl),
      sqlVal(t.logoEmoji),
      sqlVal(t.logoGradient),
      sqlVal(t.logoUrl),
      sqlVal("[]"),
      sqlVal(t.editorial.longDescription),
      sqlVal(JSON.stringify(t.editorial.useCases)),
      sqlVal(JSON.stringify(t.editorial.pros)),
      sqlVal(JSON.stringify(t.editorial.cons)),
      sqlVal("[]"),
      sqlVal(now),
      sqlVal(now),
      sqlVal(t.pricingModel),
      sqlVal(t.startingPrice),
      sqlVal(t.pricingNote),
      sqlVal(t.hasApi ? 1 : 0),
      sqlVal(t.websiteUrl.includes("github.com") ? t.websiteUrl : null),
      sqlVal(t.docsUrl || null),
      sqlVal(null),
      sqlVal(JSON.stringify(t.tagsPipe.split("|"))),
      sqlVal(JSON.stringify({})),
      sqlVal(null),
      sqlVal("featured"),
      sqlVal(t.editorsPick ? 1 : 0),
      sqlVal(t.curated ? 1 : 0),
      sqlVal(0),
      sqlVal(t.makerHandle),
      sqlVal(t.status),
      sqlVal(0),
      sqlVal(now),
      sqlVal(t.d1CategoryId),
      sqlVal(null),
      sqlVal(0),
      sqlVal(0),
      sqlVal(0),
      sqlVal(null),
      sqlVal(now),
    ];

    lines.push(`INSERT INTO tools (${cols.join(", ")}) VALUES (${vals.join(", ")});`);
  }

  const sql = lines.join("\n");
  fs.writeFileSync(outPath, sql, "utf8");
  console.log(`Wrote ${TOOLS_BATCH_8.length} tools to ${outPath}`);
  return sql;
}

if (import.meta.main) {
  generateSqlFile("/tmp/batch-8-tools.sql");
}
