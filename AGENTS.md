# Prother.dev - Agent Memory & Operating Guidelines

This document records persistent rules, architecture invariants, and asset handling standards for all AI coding agents working on Prother.dev.

---

## 1. Tool Logo & Asset Standards (STRICT REQUIREMENT)

### Core Invariant
- **NEVER use generic AI icons, fallback emojis, or colored gradient placeholder tiles for tool logos.**
- **NEVER generate, illustrate, or hallucinate synthetic logo graphics or hand-coded artwork from scratch.**
- **ALWAYS EXTRACT THE ORIGINAL LOGO ONLY**:
  1. Fetch the official vector SVG or high-resolution brand PNG directly from the tool's official GitHub repository (e.g. `logo/`, `assets/`, `docs/assets/`), official website favicon/manifest (`/favicon.svg`, `/apple-touch-icon.png`), or verified brand kit/CDN.
  2. Extract and preserve the exact authentic mark / brand geometry. Never re-draw or improvise a synthetic version.
- The user and community demand real, authentic brand assets across the entire application (Homepage, Categories, Directory, Search, Compare, and Tool Detail pages).

### Asset Location & URL Specification
1. **Local Static Storage (`public/logos/`)**:
   - Every tool must have an authentic vector logo (`/logos/<slug>.svg`) or high-resolution official brand PNG (`/logos/<slug>.png`) committed to `public/logos/`.
   - The `logoUrl` field in Convex MUST be set to `/logos/<slug>.<ext>` (e.g., `/logos/openchamber.svg`, `/logos/linear.svg`, `/logos/aider.png`).
2. **NO Manual Convex Storage URL Concatenation**:
   - NEVER generate or store URLs like `https://<deployment>.convex.cloud/api/storage/<storageId>` where `<storageId>` is an internal Convex document ID (e.g. `kg2...`).
   - Convex public storage endpoints return `HTTP 400 InvalidStoragePath` for internal IDs. This 400 error causes `<ToolLogo>` to trigger its error boundary and fall back to emoji gradient tiles.
3. **SVG Contrast & Container Standards**:
   - Vector SVGs should feature crisp geometry with dark rounded plate backdrops (e.g., `#0D0E12`, `#0B1015`, `#18181B`) or high-contrast foreground paths so they remain legible in both dark and light modes.
   - Dimensions should typically be `32x32` or `viewBox="0 0 32 32"` with `rx="6"` for corner rounding.

### Verification Checklist for Any New or Modified Tool
Before completing any task that adds or edits a tool:
1. Verify the logo file exists under `public/logos/<slug>.<ext>`.
2. Verify `logoUrl` is set to `/logos/<slug>.<ext>` in Convex.
3. Verify `curl -sI http://localhost:3000/logos/<slug>.<ext>` (or live `https://prother.dev/logos/<slug>.<ext>`) returns `HTTP 200`.
4. Run `bun run scripts/patch-all-tool-logos.ts` or equivalent script to verify Convex query output matches `/logos/<slug>.<ext>`.

---

## 2. Copy & Typography Invariants

- **Banned Punctuation**: **NO em-dashes (`—`) or en-dashes (`–`)** anywhere in tool taglines, editorial copy, seed files, or UI strings. Use standard hyphens `-`, colons `:`, or parentheses `()`.
- **Honest Pricing Labels**:
  - `free`: Completely free without payment requirements.
  - `freemium`: Permanent free tier with functional utility, plus paid tiers.
  - `paid`: Requires payment or credit card.
  - `open_source`: Permissive or public source repository.

---

## 3. Database Source of Truth

- Convex is the ONLY data store for the app (Phase B, 2026-10-07). The legacy Prisma/SQLite store (`db/custom.db`) is archived outside the repo; do not dual-write or read it.
- Any mutations, tool additions, or metadata updates apply to Convex only.

---

## 4. Convex Query Performance & Database Read I/O Invariants

- **NO Unindexed Full Table Scans**:
  - Never call `ctx.db.query("table").collect()` without index bounds (`.withIndex(...)`) or strict slice limits (`.take(N)`).
  - Every query function handling user lookup, session verification, ad rotation, or SEO metadata must execute against defined indexes to prevent Database Read I/O spikes.
- **Index Alignment**:
  - `users`: Look up by `by_email`, `by_external_auth`, `by_handle`, or `ctx.db.get()`.
  - `authSessions`: Look up by `by_token` or `by_user`.
  - `adCampaigns` / `adServeStats`: Filter by `by_placement_status` and `by_placement_day`.
  - `tools`: Query using `by_status_category` or `by_slug`.

---

## 5. Deployment Identity (read this before comparing environments)

- **Production reads are Cloudflare D1 first** (binding `DB`, database
  `prother`), with **Convex prod as cold fallback** (guards in
  `src/lib/data.ts` fall back when the binding is absent or tables are
  empty). Writes stay on Convex mutations until the writes wave lands;
  claims lead D1. Media uploads stay on Convex storage (R2 pending).
- **`.env.local` points at the Convex DEV deployment
  (`proper-kangaroo-372`)**, a stale sandbox (currently ~51 tools). It is
  NOT production data. Never compare a local dev render against the live
  site to judge catalog state; prod checks require either the Worker
  (`bunx opennextjs-cloudflare preview` for binding-backed local, reading
  the same `DB`) or the D1 remote (`bunx wrangler d1 execute prother
  --remote`) / deployed `x-data-backend` header on https://prother.dev.
- **Prod Convex deployment identity is CI-only** (CONVEX_DEPLOY_KEY and
  NEXT_PUBLIC_CONVEX_URL are GitHub secrets; never committed here).
- Editor-saved site copy drift check: prod `hero.announcement` may hold an
  older literal (e.g. "48 tools indexed") because announcement counts are
  re-formatted from live stats on render. Judge tool counts from
  `stats.tools` / directory rows, not the announced sentence.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
