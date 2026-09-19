# Prother — Worklog

Project: Prother — "Where AI products launch." (prother.dev)
Landing page built with Next.js 16 + Tailwind 4 + shadcn/ui + Prisma/SQLite.
Design language: inspired by Cloudflare Quick Tunnels screenshot — ink black (#0A0A0A), ember orange (#FF6A00), cream (#F1EDE4), mono chips/terminals, huge black display type.

---
Task ID: 1
Agent: main orchestrator (Z.ai Code)
Task: Backend foundation — Prisma schema, seed data, API routes (feed / waitlist / vote)

Work Log:
- Read PRD (Prother Master v2.0) + Cloudflare screenshot; extracted design tokens: ink #0A0A0A, ember #FF6A00, cream #F1EDE4, mono labels, concentric-ring hero glow, city-code ticker → adapted to category-slug ticker.
- Replaced prisma/schema.prisma with Prother domain: Subscriber (waitlist F-45), Category (10 cats §13), Tool (status/track/badges), Launch (votes reference launch_id per §16), Vote (anon voterKey, unique per launch — F-14). Note: `@createdAt` failed on installed Prisma parser → used `@default(now())`.
- `bun run db:push` → synced. `bun prisma/seed.ts` → 24 tools (12 today, 4 tomorrow teasers, 8 past-week incl. Promptly/CodePilotX/PixelForge/NectarSearch), 10 categories, 412 base subscribers.
- Created src/lib/prother.ts — shared types (FeedRow, FeedResponse, Teaser, TopWeekRow) + PRD F-36 ranking `score = weighted_upvotes / hours^1.2` + secondsUntilUtcMidnight.
- API routes: GET /api/feed (today new/top ranked, tomorrow teasers, topWeek, editorsPick, subscriberCount, resetsInSec), GET+POST /api/waitlist (zod-validated upsert, returns count + alreadySubscribed), POST /api/vote (anon toggle, 1 vote/visitor/launch, returns new total).
- Smoke-tested via curl: /api/feed 200 (12 launches, ranked, countdown 11478s), waitlist POST → {count:413, alreadySubscribed:false}, vote POST → {voted:true, votes:48}.

Stage Summary:
- Backend complete and verified. API contracts for UI:
  - `import type { FeedResponse, FeedRow, Teaser, TopWeekRow } from "@/lib/prother"` (type-only import — safe in client).
  - GET /api/feed → FeedResponse; POST /api/waitlist {email, source} → {count, alreadySubscribed}; GET /api/waitlist → {count}; POST /api/vote {launchId, voterKey} → {voted, votes}.
- Dev server already running on :3000 (check /home/z/my-project/dev.log). Do NOT run `bun run build`. Only route allowed: src/app/page.tsx (/).
- Next: Task 2 = full landing page UI (header, hero, ticker, how-it-works, live launch feed, agent-era, standards S1–S6, FAQ, final CTA, sticky footer).

---
Task ID: 2
Agent: full-stack-developer
Task: Complete landing page UI — all 11 sections composed on the `/` route, wired to the Task 1 APIs

Work Log:
- Read worklog.md + src/lib/prother.ts; verified live APIs via curl (feed 200: 12 launches, dayLabel "Sat, Sep 19", waitlist count 413) before writing any UI.
- globals.css: extended `@theme inline` with --color-ember/-ember-hot/-ink/-coal/-cream/-sand (kept all shadcn tokens); added marquee keyframes + `.animate-marquee` (40s linear infinite, hover-pause), thin ember scrollbar (webkit + Firefox), `::selection` ember-on-ink.
- layout.tsx: metadata → "Prother — Where AI products launch" + PRD description + OG/Twitter. Fonts & shadcn `<Toaster />` (radix, hooks/use-toast exists) left as-is.
- Components in src/components/prother/ (all 'use client', lucide icons, framer-motion fade-up whileInView once on section headings only):
  - waitlist-form.tsx — shared email capture (source prop, dark/compact variants); POST /api/waitlist, success line "✓ You're on the list — see you at 00:00 UTC." + "N on the list"; 422/error → destructive toast. Reused 3× (hero, sidebar, final CTA).
  - site-header.tsx — sticky z-50 bg-ink/85 backdrop-blur; Hexagon logo fill-ember; center anchors; mobile hamburger dropdown; CTA → #submit.
  - hero.tsx — radial ember glow + 4 concentric rings + 6 rotated ember dashes backdrop; pill, H1 ("launch." in text-ember), WaitlistForm(source="hero"), social proof count from GET /api/waitlist (412+ placeholder), live "N LAUNCHES TODAY" chip, stat chips; right: daily-digest zsh terminal with ember ▲votes + blinking cursor.
  - category-ticker.tsx — #categories marquee, 10 hardcoded slug→emoji items duplicated 2× (aria-hidden dupe).
  - how-it-works.tsx — cream section; dark dot-grid panel with 3 flow cards + MoveRight separators (card 02 = ember highlight w/ chips); 3 white stat cards ("≤5 min", "0", "10") in #C24A00.
  - launch-feed.tsx — THE PRODUCT: GET /api/feed via shared use-feed hook (module-level promise dedupe so Hero's todayCount reuses one request); New/Top Today/Tomorrow tabs (client-side switch); feed rows with rank, optimistic upvote (Triangle, POST /api/vote, voterKey = crypto.randomUUID() in localStorage "prother_voter_key", server-reconcile + revert + toast on failure), gradient emoji logos, Editor's Pick/Curated/Re-launch/Claim badges, pricing meta line + OSS/API suffixes; tomorrow teasers with GOES LIVE IN {H}H; HH:MM:SS countdown from resetsInSec (1s tick, auto-refetch at UTC midnight via refresh()); sidebar (order-first lg:order-last): 📬 Daily Launch w/ compact WaitlistForm, 🏆 Top Week 5 rows, ⭐ Editor's Pick (ember-tinted card), Browse category chips + "+4 more"; skeleton loading (3 pulsing rows); yesterday row + "Launch it free" CTA; fixed mobile ember submit bar w/ safe-area-inset padding.
  - agent-era.tsx — full-bleed bg-ember text-black; numbered 01–03 list; launch-day zsh terminal (emerald ✓s, ▲31 in text-ember-hot).
  - standards.tsx — cream; S1–S6 white cards (#C24A00 mono ids) + rejection/resubmit italic footer.
  - faq.tsx — shadcn Accordion (single, collapsible) dark-styled, 4 QA pairs.
  - final-cta.tsx — #submit, bottom ember glow, "Be there on / day one." + centered WaitlistForm(source="cta").
  - site-footer.tsx — mt-auto; 4-col grid (logo+blurb, Product, Resources, Company anchors); bottom bar "© 2026 Prother — Curation is never sold." / "STANDARDS · PRIVACY · STATUS".
- page.tsx — only route; root wrapper `min-h-screen flex flex-col bg-ink pb-16 md:pb-0` (pb-16 clears the mobile sticky bar), footer sticks via mt-auto.
- Lint fix: react-hooks/set-state-in-effect errors → countdown refactored to render-time deadline ref + 1s `now` ticker (setState only inside interval callback), removed voteState seed effect (rows fall back to row.votes/row.voted when key absent; onVote seeds on first click).
- QA: `bun run lint` → 0 errors; dev.log → ✓ Compiled, GET / 200, no runtime errors; curl / | grep → "Where AI products", "TODAY'S LAUNCHES", "Be there on", "Questions, answered", "Every tool passes all six", "Curation is never sold" all present in SSR HTML; rg check → no blue/indigo/sky/cyan/violet classes (yellow-500 "Curated" chip + emerald-400 terminal ✓s are spec-mandated).

Stage Summary:
- Landing page UI complete: 11 sections live on `/`, fully wired to backend (feed fetch + vote toggle + 3 waitlist sources + live social-proof counts + UTC countdown with midnight rollover).
- Deviations from spec (minor): (1) countdown uses render-derived deadline + ticking `now` instead of setState-in-effect to satisfy React hooks lint; (2) "Visit ↗" on feed rows is a non-navigating span (websiteUrl not in FeedRow — per PRD no external links from feed); (3) "Why we picked it →" links to #standards; (4) feed auto-refetch on rollover calls refresh() from use-feed rather than reloading the page; (5) marquee pauses on hover (bonus).
- Design tokens applied exactly (ink/coal/ember/ember-hot/cream/sand, #C24A00 on cream for contrast); sticky-footer rule verified; mobile safe-area respected.
- Do NOT run bun run build; dev server on :3000 serving 200. Next: none — Task 2 is the final stage of the PRD scope.

---
Task ID: 3
Agent: main orchestrator (Z.ai Code)
Task: End-to-end QA with agent-browser + bug fixes

Work Log:
- agent-browser: opened /, full-page + per-section viewport screenshots (hero, ticker, how-it-works, stats, feed, agent-era, standards, FAQ, footer). All 11 sections render with correct design tokens; cream/orange sections confirmed via real scrolling (full-page captures show them blank only because framer-motion whileInView hasn't fired in Playwright full-page mode).
- Interaction tests PASSED: Top Today / Tomorrow (4) tab switching; upvote toggle (47→48→49→48→49 with server reconcile; earlier smoke-test vote explained the first jump); hero waitlist submit → success state + toast + count 413→414; countdown ticking (02:57:06 → live); FAQ accordion expand verified via data-state=open.
- BUG 1 (fixed): mobile horizontal overflow — document scrollWidth 583 vs 390. Root causes: (a) compact WaitlistForm input couldn't shrink (no min-w-0/flex-1); (b) grid blowout — #feed grid items lacked min-w-0 so the implicit track sized to content min-width (aside right edge = 583px). Fixes: `min-w-0 flex-1` on Input, `min-w-0` on both grid children (aside + main), `overflow-x-clip` on root wrapper in page.tsx as safety net. Verified: docsw 390 vs 390, aside right = 374.
- BUG 2 (fixed): /api/feed displayed baseUpvotes only, ignoring anonymous votes already cast (tally inconsistency vs POST /api/vote). Fix: feed route now groupBy votes per launchId and merges into totals for today's + top-week launches.
- Cleared QA test votes from DB (2 rows) for a clean demo state.
- Final: lint 0 errors; dev.log clean (GET / 200, GET /api/feed 200); mobile 390px + desktop 1440px both verified; sticky footer + mobile sticky submit bar with safe-area confirmed.

Stage Summary:
- Site is production-ready for the landing-page scope: browser-verified rendering, all core interactions working, no console/runtime errors, no horizontal overflow on mobile.
- QA artifacts in /home/z/my-project/qa/*.png (16 screenshots).
- Known minor items for next cycle: hero social-proof count can lag the POST response by 1 until refetch; framer-motion whileInView means below-fold sections need JS to fade in (SSR text still crawlable); "Visit ↗" is intentionally non-navigating (PRD: no external links from feed).

---
Task ID: 4
Agent: main orchestrator (Z.ai Code)
Task: Handover doc + 15-minute webDevReview cron

Work Log:
- Appended this Task 3/4 record to worklog.md.
- Created scheduled cron job (kind=webDevReview, fixed_rate 900s) with the mandated assessment/QA/development loop description.

Stage Summary:
- Project state: Prother landing page (PRD Appendix D copy + §9 feed demo + Cloudflare-inspired design system) live on `/` with Prisma-backed feed/waitlist/vote APIs. Recurring 15-min agent review enabled for continuous iteration.

---
Task ID: 5
Agent: main orchestrator (Z.ai Code)
Task: webDevReview cycle #1 — regression QA + new features (tool detail modal, ⌘K search) + styling details

Work Log:
- Regression QA (agent-browser): / loads 200, 12 feed rows, no console errors, no overflow (1280/1280). Vote & waitlist flows unaffected.
- NEW API: GET /api/tools/[slug] (PRD §10.1) — full detail: description, pricing {model,price,note}, links (website/github/docs/twitter), meta (category/status/submitted/launch day), standards S1–S6 checklist (passed=!scheduled for scheduled launches), votes, and `?vk=<voterKey>` → per-visitor voted state (F-14 integrity: modal now reflects existing ballots).
- NEW shared module: src/lib/standards.ts (STANDARD_DEFS, client-safe); ToolDetailResponse type added to lib/prother.ts.
- NEW explorer-store.ts (zustand): {slug, searchOpen} shared by header, feed rows, and dialogs.
- NEW tool-explorer.tsx mounted once in page.tsx:
  - ToolDetailDialog: dark coal modal — gradient banner header + overlapping emoji logo, badges, action row (Visit website ember / GitHub / Docs / X ghosts + inline upvote), meta grid (CATEGORY · STATUS Verified/In review · SUBMITTED · LAUNCH DAY), ember pricing card, description, QUALITY BAR 6/6 checklist grid, maker footer w/ Claim link. Detail fetch keyed by slug (`key={slug}` remount pattern to satisfy react-hooks/set-state-in-effect lint — 0 errors).
  - Vote sync: modal dispatches `prother:vote` CustomEvent; LaunchFeed listens and merges into its voteState (feed behind modal stays consistent). Modal initial voted state comes from server via ?vk=.
  - CommandPalette (⌘K / ctrl+K listener): groups Today's launches / Tomorrow / Top this week / Categories / Actions (Submit, Standards, Jump to feed); fuzzy filter; Enter → closes palette then opens tool modal after 80ms (radix dialog handoff).
- Feed rows now open the modal (click/Enter, role=button + aria-label); upvote + Claim stopPropagation; "Visit ↗" relabeled "Details ↗" with group-hover ember. TopWeek rows + Editor's Pick card also open the modal (now proper <button>s).
- Header: new "Search tools ⌘K" button (icon-only on mobile, kbd chip on lg) + mobile menu entry.
- Styling details: ScrollProgress (fixed 3px ember gradient bar, spring-smoothed, z-60), BackToTop (appears >600px, animated, positioned above mobile submit bar), prefers-reduced-motion support (marquee + transitions), cmdk dark-theme overrides in globals.css ([cmdk-root/input/item/group-heading/separator] scoped under [role=dialog] — the palette inherited light popover tokens from :root).
- Bugs fixed this cycle: (1) palette light-on-white text (popover token) → scoped dark CSS; (2) mobile modal overflow — DialogContent max-w-2xl overrode viewport-safe default → `max-w-[calc(100vw-2rem)] sm:max-w-2xl` (verified: dialog right=374, docsw=390).
- Verified: lint 0 errors; dev.log clean (GET / + /api/feed + /api/tools/promptly 200); QA artifacts qa/17–24 (modal, standards checklist, palette filtered "voice" → VoiceLoom, mobile modal, desktop final).

Stage Summary:
- Prother is now interactive beyond the feed: any tool (today, tomorrow, top week, or via search) opens a rich detail modal with pricing, links, and the quality-bar audit — the PRD §10.1 experience without leaving the landing page.
- ⌘K command palette is the flagship UX addition (header button + keyboard shortcut + arrow navigation).
- Risks/next: (1) modal vote count and feed refetch could be unified via a shared vote cache; (2) seeded external URLs are fictional (promptly.ai etc.) — swap for real tools before production; (3) hero social-proof count still lags POST response by 1 until reload; (4) consider share buttons (Copy link / Tweet) in modal footer next cycle.
