import { TOOLS_BATCH_4 } from "./add-daily-tools-batch-4";

export function generateD1Statements() {
  const statements: Array<{ sql: string; params: any[] }> = [];

  for (const t of TOOLS_BATCH_4) {
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

if (process.argv[1]?.endsWith("sync-batch-4-d1.ts")) {
  const stmts = generateD1Statements();
  console.log(JSON.stringify(stmts, null, 2));
}
