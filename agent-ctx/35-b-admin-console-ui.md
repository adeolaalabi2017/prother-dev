# Task 35-b — Admin Console editorial content + branding uploads (admin-console-ui agent)

## Scope owned
- `src/components/prother/admin-console.tsx` (ONLY file modified): AdminTool type extension, ListingEditor "Editorial content" group, SettingsTab "Branding" group.
- No API routes or shared components touched. Contracts coded as specified (all landed by verify time: `lib/tool-editorial.ts`, admin tools GET/PATCH editorial merge + 400 {errors}, ImageUploadField `faviconMode` + always-on limitHint).

## Shipped
1. **AdminTool type** gained `longDescription, useCases, pros, cons, alternatives, pricingCheckedAt, contentUpdatedAt` (all defensively defaulted with `?? []` / `?? ""` at the mount so the UI renders even before the backend merge lands).
2. **ListingEditor — Editorial content group** (between "Listing media" and FeaturesEditor):
   - Header row: FileText icon + "Editorial content" + `Updated {Mon D, YYYY}` (`fmtDayDate`) when `contentUpdatedAt` set.
   - Long description Textarea rows=6, maxLength 5000, live `{n}/5000` counter, spec helper copy verbatim.
   - Use cases: repeatable cards (title Input maxLength 80 + body Textarea rows=2 maxLength 400 + Trash2 remove), "+ Add use case", `Use cases (n/6)` counter, cap 6.
   - Pros/Cons: one mapped section each in `grid gap-4 sm:grid-cols-2`, Input rows maxLength 160 with remove, "Add pro"/"Add con" disabled at 6, `(n/6)` counters, honest-limitation helper copy.
   - Alternatives: slug chips with X remove; "Add alternative" Radix Select fed by a one-shot GET /api/admin/tools on editor expand (promise-callback setState, `alive` cancel flag, self + already-selected filtered out); disabled "Loading listings…" state while fetching, empty-state text when no options, "Cap reached (6)" text at max.
   - Pricing fact-check: Switch (checked = pricingCheckedAt non-null) with min-h-11 label row, caption "Last checked {date}." / "Not fact-checked yet…".
3. **Save payload (diff-gated, initialEditorial ref like initialMedia)**: `longDescription` (trimmed, empty→null), `useCases`, `pros`, `cons`, `alternatives`, `pricingChecked` (boolean) — each key sent ONLY when it differs from the mount snapshot; untouched saves are complete no-ops (proven: pricingCheckedAt kept its first stamp after later untouched saves). 400 `{ errors }` → destructive toast, title "Save failed", description = errors joined with spaces; legacy `{ error }` still handled.
4. **SettingsTab — Branding group** at the very top before SETTING_GROUPS: group card (Hexagon icon, mono ember title, spec note verbatim), `grid gap-4 sm:grid-cols-2` with "Site logo" (square ImageUploadField, purpose="branding", spec hint) and "Favicon" (faviconMode, purpose="branding", spec hint). Under each: current URL in truncated mono text-xs ("No logo/favicon stored" when unset) + "Clear" button (sets `""`, only rendered when set). Values live in the existing `values` KV state under `branding.logoUrl` / `branding.faviconUrl`, so the normal "Save site copy" PUT persists them; /api/site serves them site wide.

## Verification (all green)
- `bun run lint`: 0 errors, 0 warnings. `bunx tsc --noEmit`: no errors in src/ (residual: examples/, skills/, and parallel agent's in-progress prisma/enrich-tools.ts → missing ./editorial-data-a module, not mine).
- E2E (agent-browser, key ember-dev): zapier expand → all controls render; long description + 1 use case + 1 pro + bardeen alternative via Select + Pricing checked ON → Save → "Zapier saved" toast → server row shows all values + pricingCheckedAt/contentUpdatedAt stamps → reload + re-expand shows persisted values, `Updated Sep 23, 2026` header, `Last checked Sep 23, 2026.` caption. 400 path: pro filled with " " → "Save failed / Pros item 1 is empty." toast. Settings: Branding group renders, favicon 512KB pre-check rejects a 600KB PNG ("Favicons are limited to 512 KB…"), 102B PNG upload → URL + Clear appear → Save → "16 keys written" + /api/site serves branding.faviconUrl → Clear → Save → KV value "".
- QA cleanup: test media file deleted (library back to 0 files / 0 bytes). Zapier editorial content LEFT in place (created via the real UI per task instructions; realistic factual copy). dev.log: no runtime errors.

## Deviations / notes for next agents
- The shared ImageUploadField (parallel-agent version) now renders its own `limitHint` line ALWAYS plus the passed `hint` — so the branding cards show both a format line and the spec hint. Spec-required hint copy kept verbatim.
- "When the group first expands" is implemented as "when the ListingEditor mounts" (the row expansion) — one-shot fetch per expand, not per render.
- Remove icon buttons match the file's existing FeaturesEditor pattern (`rounded-lg p-2`, Trash2 size-3.5) rather than 44px squares, for in-editor consistency; primary controls (Save, add buttons, switch row) keep min-h-11/touch-friendly sizes.
