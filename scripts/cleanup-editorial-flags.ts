/**
 * Data-integrity cleanup for the directory (one-shot, idempotent).
 *
 * Two problems, both in the Convex `tools` table:
 *
 *  1. `vorflux-test-2` is a seeded QA fixture (tagline "Test tagline") that is
 *     still `status: "live"`, so it renders at /tools/vorflux-test-2 and was
 *     being published in the sitemap. This sets status to "removed", which is
 *     what the admin console's delete does (soft delete — the row is kept for
 *     referential integrity with reviews/comments).
 *
 *  2. `editorsPick` is set on 66 of 108 tools. The badge means nothing when
 *     most of the directory carries it, and it undercuts the "no pay-to-play"
 *     positioning — a visitor reasonably reads a badge this common as sold
 *     placement. This keeps the flag on the tools listed in KEEP_EDITOR_PICK
 *     and clears it everywhere else.
 *
 * Usage:
 *   node --experimental-strip-types scripts/cleanup-editorial-flags.ts --url <convex-host>
 *   node --experimental-strip-types scripts/cleanup-editorial-flags.ts --url <convex-host> --apply
 *
 * Review KEEP_EDITOR_PICK before running with --apply: it is a judgement call
 * about which tools deserve the badge, and the list is deliberately explicit
 * rather than "top N by score" so the selection is reviewable in a diff.
 *
 * --url is REQUIRED, and that is deliberate. .env.local in this repo points at
 * a development deployment whose dataset is NOT the one production serves
 * (46 tools vs 108, and well-known listings like `cline` are absent from it).
 * A script that silently inherited that URL would happily "clean up" the wrong
 * database and report success. Forcing the deployment to be named on the
 * command line removes that whole class of mistake.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

/**
 * The tools that keep the Editor's Pick badge. Six, matching the homepage
 * section (convex/tools.ts `homepage` slices picks to 6). Replace this list
 * with your own selection — an empty array clears the badge everywhere, which
 * is the safest state to ship while you decide.
 */
const KEEP_EDITOR_PICK = [
  "cline",
  "cursor",
  "zed",
  "vllm",
  "openrouter",
  "unsloth",
] as const;

const APPLY = process.argv.includes("--apply");

/** Resolve the target deployment from --url, never from .env.local. */
function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? (process.argv[i + 1] ?? null) : null;
}

const URL_ARG = argValue("--url");

function loadDotLocal(path: string): void {
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadDotLocal(join(root, ".env.local"));
loadDotLocal(join(root, ".env"));

const CONVEX_URL = URL_ARG
  ? URL_ARG.startsWith("http")
    ? URL_ARG
    : `https://${URL_ARG}`
  : null;
if (!CONVEX_URL) {
  console.error(
    [
      "--url is required. This script mutates a Convex database and the",
      "deployment must be named explicitly — .env.local in this repo points",
      "at a development dataset that is NOT what production serves.",
      "",
      "  usage:",
      "    bun scripts/cleanup-editorial-flags.ts --url <convex-host>            # dry run",
      "    bun scripts/cleanup-editorial-flags.ts --url <convex-host> --apply    # write",
    ].join("\n"),
  );
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);
// admin.toolsTable is the same admin-console listing the console itself uses
// (empty filters = every tool, all statuses).
const { tools } = await client.query(api.admin.toolsTable, {
  q: "",
  status: "",
  category: "",
});

const keep = new Set<string>(KEEP_EDITOR_PICK);
let removedTest = 0;
let clearedPicks = 0;

// ── 1. Retire the QA fixture ───────────────────────────────────────────────
for (const t of tools) {
  if (t.slug !== "vorflux-test-2") continue;
  if (t.status === "removed") {
    console.log(`fixture: vorflux-test-2 already removed`);
    continue;
  }
  removedTest++;
  console.log(
    `${APPLY ? "removing" : "would remove"}: vorflux-test-2 (status=${t.status})`,
  );
  if (APPLY) {
    await client.mutation(api.adminCrud.toolRemove, {
      toolLegacyId: String(t.id),
    });
  }
}

// ── 2. Curate the Editor's Pick flag ────────────────────────────────────────
for (const t of tools) {
  if (!t.editorsPick) continue;
  if (keep.has(t.slug)) continue;
  clearedPicks++;
  console.log(`${APPLY ? "clearing" : "would clear"} editorsPick: ${t.slug}`);
  if (APPLY) {
    await client.mutation(api.adminCrud.toolPatch, {
      toolLegacyId: String(t.id),
      // nowMs is required by the validator even though this patch carries no
      // editorial fields (it only stamps contentUpdatedAt when they change).
      nowMs: Date.now(),
      data: { editorsPick: false },
    });
  }
}

const remaining = tools.filter((t) => t.editorsPick && keep.has(t.slug)).length;

console.log(
  `\n${APPLY ? "applied" : "DRY RUN — pass --apply to write"}:` +
    `\n  fixture rows removed : ${removedTest}` +
    `\n  editorsPick cleared   : ${clearedPicks}` +
    `\n  editorsPick remaining : ${remaining} (of ${tools.length} tools)`,
);
if (!APPLY) {
  console.log("\nno writes were made");
}
