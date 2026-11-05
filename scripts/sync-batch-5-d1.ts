import { TOOLS_BATCH_5 } from "./add-daily-tools-batch-5";
import * as fs from "node:fs";

export function generateD1Statements() {
  const statements: Array<{ sql: string; params: any[] }> = [];

  for (const t of TOOLS_BATCH_5) {
    statements.push({
      sql: "DELETE FROM tools WHERE slug = ? OR id = ?;",
      params: [t.slug, t.id],
    });

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

    const placeholders = cols.map(() => "?").join(", ");
    const sql = `INSERT INTO tools (${cols.join(", ")}) VALUES (${placeholders});`;

    const now = Date.now();
    const values = [
      t.id,
      t.slug,
      t.name,
      t.tagline,
      t.description,
      t.websiteUrl,
      t.logoEmoji,
      t.logoGradient,
      t.logoUrl,
      JSON.stringify([]),
      t.editorial.longDescription,
      JSON.stringify(t.editorial.useCases),
      JSON.stringify(t.editorial.pros),
      JSON.stringify(t.editorial.cons),
      JSON.stringify([]),
      now,
      now,
      t.pricingModel,
      t.startingPrice,
      t.pricingNote,
      t.hasApi ? 1 : 0,
      t.websiteUrl.includes("github.com") ? t.websiteUrl : null,
      t.docsUrl || null,
      null,
      JSON.stringify(t.tagsPipe.split("|")),
      JSON.stringify({}),
      null,
      "featured",
      t.editorsPick ? 1 : 0,
      t.curated ? 1 : 0,
      0,
      t.makerHandle,
      t.status,
      0,
      now,
      t.d1CategoryId,
      null,
      0,
      0,
      0,
      t.id,
      now,
    ];

    statements.push({ sql, params: values });
  }

  return statements;
}

export function generateSqlFile(outPath: string) {
  function sqlVal(v: any): string {
    if (v === null || v === undefined) return "NULL";
    if (typeof v === "number") return String(v);
    return "'" + String(v).replace(/'/g, "''") + "'";
  }

  const lines: string[] = [];
  for (const t of TOOLS_BATCH_5) {
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
      now,
      now,
      sqlVal(t.pricingModel),
      sqlVal(t.startingPrice),
      sqlVal(t.pricingNote),
      t.hasApi ? 1 : 0,
      sqlVal(t.websiteUrl.includes("github.com") ? t.websiteUrl : null),
      sqlVal(t.docsUrl || null),
      "NULL",
      sqlVal(JSON.stringify(t.tagsPipe.split("|"))),
      sqlVal("{}"),
      "NULL",
      sqlVal("featured"),
      t.editorsPick ? 1 : 0,
      t.curated ? 1 : 0,
      0,
      sqlVal(t.makerHandle),
      sqlVal(t.status),
      0,
      now,
      sqlVal(t.d1CategoryId),
      "NULL",
      0,
      0,
      0,
      sqlVal(t.id),
      now,
    ];

    lines.push(`INSERT INTO tools (${cols.join(", ")}) VALUES (${vals.join(", ")});`);
  }

  fs.writeFileSync(outPath, lines.join("\n") + "\n");
  console.log(`Wrote D1 SQL statements to ${outPath}`);
}

if (process.argv[1]?.endsWith("sync-batch-5-d1.ts")) {
  generateSqlFile("/tmp/batch5_d1.sql");
}
