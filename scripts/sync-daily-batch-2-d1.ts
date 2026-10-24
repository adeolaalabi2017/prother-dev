import { TOOLS_BATCH_2 } from "./add-daily-tools-batch-2";

const NOW = Date.now();

export function generateD1Statements() {
  const statements: { deleteSql: string; deleteParam: string; insertSql: string; insertParams: any[] }[] = [];

  for (const tool of TOOLS_BATCH_2) {
    const deleteSql = `DELETE FROM tools WHERE slug = ? OR id = ?;`;
    const deleteParam = tool.slug;

    const insertSql = `
      INSERT INTO tools (
        id, slug, name, tagline, description, website_url,
        logo_emoji, logo_gradient, logo_url, screenshot_urls_json,
        long_description, use_cases_json, pros_json, cons_json, alternatives_json,
        pricing_checked_at, content_updated_at, pricing_model, starting_price, pricing_note,
        has_api, github_url, docs_url, twitter_url, tags_json, features_json,
        maker_email, track, editors_pick, curated, claimed, maker_handle,
        status, pinned, verified_at, category_id, submission_id,
        comment_count, review_count, rating_sum_x100, legacy_id, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      );
    `;

    const insertParams = [
      tool.id,
      tool.slug,
      tool.name,
      tool.tagline,
      tool.description,
      tool.websiteUrl,
      tool.logoEmoji,
      tool.logoGradient,
      tool.logoUrl,
      JSON.stringify([]),
      tool.editorial.longDescription,
      JSON.stringify(tool.editorial.useCases),
      JSON.stringify(tool.editorial.pros),
      JSON.stringify(tool.editorial.cons),
      JSON.stringify(tool.editorial.alternatives),
      NOW,
      NOW,
      tool.pricingModel,
      tool.startingPrice,
      tool.pricingNote,
      tool.hasApi ? 1 : 0,
      null,
      tool.docsUrl || null,
      null,
      JSON.stringify(tool.tagsPipe.split("|")),
      JSON.stringify({}),
      null,
      "editor_seed",
      tool.editorsPick ? 1 : 0,
      tool.curated ? 1 : 0,
      0,
      tool.makerHandle,
      tool.status,
      0,
      null,
      tool.d1CategoryId,
      null,
      0,
      0,
      0,
      tool.id,
      NOW,
    ];

    statements.push({ deleteSql, deleteParam, insertSql, insertParams });
  }

  return statements;
}

if (process.argv[1]?.endsWith("sync-daily-batch-2-d1.ts")) {
  console.log(JSON.stringify(generateD1Statements(), null, 2));
}
