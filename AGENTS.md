# Prother.dev - Agent Memory & Operating Guidelines

This document records persistent rules, architecture invariants, and asset handling standards for all AI coding agents working on Prother.dev.

---

## 1. Tool Logo & Asset Standards (STRICT REQUIREMENT)

### Core Invariant
- **NEVER use generic AI icons, fallback emojis, or colored gradient placeholder tiles for tool logos.**
- The user and community demand real, authentic brand assets across the entire application (Homepage, Categories, Directory, Search, Compare, and Tool Detail pages).

### Asset Location & URL Specification
1. **Local Static Storage (`public/logos/`)**:
   - Every tool must have an authentic vector logo (`/logos/<slug>.svg`) or high-resolution official brand PNG (`/logos/<slug>.png`) committed to `public/logos/`.
   - The `logoUrl` field in both Convex and SQLite (`db/custom.db`) MUST be set to `/logos/<slug>.<ext>` (e.g., `/logos/openchamber.svg`, `/logos/linear.svg`, `/logos/aider.png`).
2. **NO Manual Convex Storage URL Concatenation**:
   - NEVER generate or store URLs like `https://<deployment>.convex.cloud/api/storage/<storageId>` where `<storageId>` is an internal Convex document ID (e.g. `kg2...`).
   - Convex public storage endpoints return `HTTP 400 InvalidStoragePath` for internal IDs. This 400 error causes `<ToolLogo>` to trigger its error boundary and fall back to emoji gradient tiles.
3. **SVG Contrast & Container Standards**:
   - Vector SVGs should feature crisp geometry with dark rounded plate backdrops (e.g., `#0D0E12`, `#0B1015`, `#18181B`) or high-contrast foreground paths so they remain legible in both dark and light modes.
   - Dimensions should typically be `32x32` or `viewBox="0 0 32 32"` with `rx="6"` for corner rounding.

### Verification Checklist for Any New or Modified Tool
Before completing any task that adds or edits a tool:
1. Verify the logo file exists under `public/logos/<slug>.<ext>`.
2. Verify `logoUrl` is set to `/logos/<slug>.<ext>` in both Convex and SQLite.
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

## 3. Database Dual-Write & Synchronization

- Prother maintains both Convex (production reactive database) and SQLite (`db/custom.db`) for shadow/local compatibility.
- Any mutations, tools additions, or metadata updates must be applied to both data stores.
- When committing changes, ensure both `db/custom.db` and the corresponding scripts/files are committed and pushed to `main`.
