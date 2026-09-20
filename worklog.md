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

---
Task ID: 6
Agent: main orchestrator (Z.ai Code)
Task: webDevReview cycle #2 — full QA regression + category filtering, shareable deep links, waitlist sync, styling details

Work Log:
- Assessment: server healthy (GET /, /api/feed, /api/waitlist, /api/tools/* all 200), dev.log clean. Browser QA (agent-browser): 12 feed rows, vote toggle 48→49→48, modal, ⌘K, mobile 390px no overflow, desktop 1280px no overflow, no console errors → phase judged stable, so this cycle = bug fixes + new features.
- BUG FIX 1 (pre-existing, uncovered by QA): CATEGORIES constant had no `name` field → ⌘K palette category items rendered EMPTY labels (a11y tree announced only "FILTER") and BROWSE chip tooltips were undefined. Added full `name` per category (mirrors seeded DB rows) in src/components/prother/categories.ts.
- BUG FIX 2: tool modal CATEGORY value truncated ("Generative Ai...") → removed `truncate`, added leading-snug wrap + title attr.
- BUG FIX 3 (styling): feed "Claim this →" mono arrow rendered as stray dots → restyled as dashed ember chip with lucide ArrowUpRight ("Claim this ↗").
- NEW FEATURE — category filtering of the launch feed (shared zustand state `categoryFilter` in explorer-store):
  - BROWSE sidebar chips are now real toggle buttons (ember fill when active, active:scale-95, title=full name).
  - Filter applies to New/Top rows AND Tomorrow teasers (Teaser type already carried category).
  - Animated filter status bar above the list ("FILTER · 🤖 Chatbots" + CLEAR button, AnimatePresence height/opacity) + empty state with "Show all categories" reset.
  - ⌘K palette "Categories" group now APPLIES the filter + smooth-scrolls to #feed (previously scrolled to a static section).
- NEW FEATURE — shareable tool deep links:
  - openTool/closeTool now sync `location.hash` via history.replaceState (#tool=<slug>).
  - ToolExplorer opens the modal from `#tool=<slug>` on page load (fresh-load verified: /#tool=pixelforge).
  - Modal action row: Copy link button (Link2 → emerald Check for 1.6s, clipboard write, toast fallback on failure) + Share on X (twitter intent with prefilled "🚀 Name — tagline is on Prother" + share URL).
- NEW FEATURE — waitlist social-proof instant sync: WaitlistForm dispatches `prother:waitlist` {count}; Hero SocialProofCount listens → count updates without reload (verified 414→415 live).
- NEW FEATURE — hero terminal is now data-driven from the live feed: #1 name/tagline/votes, CLIMBING = top[1]/top[2], Editor's Pick, dayLabel, remaining-launches count (seeded copy kept as fallback).
- STYLING DETAILS: framer-motion layoutId sliding ember pill on feed tabs; rank #1 ember bold + ranks 2-3 brightened (tabular-nums); vote counts pop via keyed motion.span (spring, ember flash); feed rows get translate-x hover + sliding ember left accent bar; active:scale press feedback on all vote buttons + Visit website; category ticker edge fade masks (ink gradients); modal vote count tabular-nums.
- QA artifacts qa/25–36. Test vote + test subscriber (sync-test@example.com) removed from DB afterwards.
- Verified after all changes: `bun run lint` 0 errors; dev.log clean (no runtime errors); reload → 12 rows, no console errors, docsw 1280/390 == viewport, hash cleared after modal close.

Stage Summary:
- The feed is now genuinely explorable: filter by 10 categories (chips or ⌘K), every tool has a shareable deep link with copy/X-share actions, and all counts (votes, subscribers) update live without reloads.
- Bugs fixed: empty palette category labels (a11y), modal category truncation, Claim chip rendering.
- Remaining risks/next: (1) seeded external URLs still fictional (swap before prod); (2) filter state is session-only (no URL sync — could persist via ?cat= query); (3) could add per-category counts in BROWSE chips + ⌘K results; (4) possible next features: recent-launches archive (yesterday), OG meta for #tool deep links, launch-day reminder opt-in.

---
Task ID: 7
Agent: main orchestrator (Z.ai Code)
Task: webDevReview cycle #3 — deep-link robustness fix, Yesterday archive, category counts, ?cat= URL sync, scroll-spy + a11y styling pass

Work Log:
- Assessment: server healthy (/, /api/feed, /api/tools/* all 200, dev.log clean). Browser QA: no overflow (1280/390), vote toggle OK, filter OK. Found 1 QA issue: /#tool=<slug> deep link only opened on true reload — same-document hash navigation (paste link in same tab, in-page #tool links, back/forward) never opened the modal because the hash effect ran once at mount only. Verified via network log (no /api/tools fetch fired).
- FIX — deep-link robustness (tool-explorer.tsx): ToolExplorer now listens to `hashchange`; hash match → openTool, hash cleared (browser Back) → closeTool. Mount pass is open-only (initial=true) to avoid redundant replaceState. Verified: location.hash='#tool=voiceloom' on a loaded page opens the modal; history.back() closes it; ?cat= survives.
- NEW — Yesterday archive tab (PRD-consistent "voting closed" semantics):
  - /api/feed now returns `yesterday: FeedRow[]` (final standings, votes desc), `yesterdayLabel` (e.g. "Sep 18"), and `categoryCounts` (today's launches per category slug). Yesterday launch IDs merged into the anon-vote groupBy. Types extended in lib/prother.ts (FeedResponse).
  - Feed: 4th tab `Yesterday (N)` with responsive labels (mobile: New/Top/Tmrw (4)/Yest. (3) — fits 390px, no overflow; desktop: full labels). Archive header rule "ARCHIVE · Sep 18 · FINAL STANDINGS · VOTING CLOSED"; rows render locked FinalScore tiles (no upvote button; tooltip "Voting closed — final #N score"); footer note "Winner gets the top of tomorrow's daily email. Voting re-opens at 00:00 UTC."; bottom-left static text is now a real toggle: "← Yesterday · Sep 18 [N]" ↔ "→ Back to today's launches". Category filter applies to yesterday rows too; empty-state copy adapts ("launches yesterday").
- NEW — per-category counts: BROWSE chips show mono count pills (hidden when 0) + sub-label "TODAY'S LAUNCHES PER CATEGORY"; title="name · N today"; ⌘K palette category items show "N today" pill.
- NEW — URL-synced category filter: explorer-store.setCategoryFilter syncs ?cat=<slug> via replaceState (validated against CATEGORIES on restore at load). Verified: chip click → ?cat=coding-tools; reload → filter/chip/FILTER bar restored, 1 row.
- STYLING/A11Y: header scroll-spy — IntersectionObserver-free passive scroll handler picks the section nearest above the 96px line (fixed array-order bug where "Categories" won over "Feed"); active link = text-ember + sliding ember underline + aria-current. globals.css: section[id] scroll-margin-top 5rem (anchors no longer hide under sticky header), global ember :focus-visible ring (2px #FF6A00 + offset), html smooth-scroll (respects reduced-motion override). Header "The Daily" now xl-only (de-clutters 1280px), nav gap-7/xl:gap-8.
- QA artifacts qa/37–44 (filter, yesterday tab desktop, mobile tabs, browse counts, palette counts).
- Verified: `bun run lint` 0 errors; dev.log clean (GET /api/feed 200); no page errors; no DB changes this cycle (test vote toggles net-zero, no waitlist writes).

Stage Summary:
- Prother now has a complete 4-state feed day cycle (yesterday archive → today live → tomorrow teasers) with PRD-consistent voting rules, category exploration with live counts, fully shareable state (#tool= + ?cat= survive reload AND same-document navigation), and a scroll-aware header.
- Remaining risks/next: (1) seeded external URLs still fictional (swap before prod); (2) ⌘K "Jump to the feed" could also honor ?cat= deep link (?cat= without scroll — could auto-scroll on restore); (3) could persist selected tab (new/top) in URL too (?tab=); (4) hero social-proof count edge case from Task 5 still open (lags POST by 1 until refetch — waitlist event now syncs it, consider resolved); (5) possible next: launch-day calendar view, maker submission flow (PRD §10.2), OG image route for #tool links.

---
Task ID: 8
Agent: main orchestrator (Z.ai Code)
Task: webDevReview cycle #4 — PRD §11 Submission Wizard (Track B: community submit) + ?tab= persistence + CTA rewiring

Work Log:
- Assessment: server healthy, 12 rows, no overflow/errors (agent-browser). Stable → new-feature cycle.
- PRD re-read (upload/Prother.dev PRD.pdf pp.5–11): §7 standards S1–S6, §8 dual-track supply, §11 wizard spec — 5 steps (Product/Describe/Pricing & links/Media/Confirm), persistent live-preview right rail, duplicate interstitial on URL blur, tagline 5–60 live counter, category radio with one-line helpers, ≤5 controlled-vocab tags, Open Source → GitHub required, confirm = 2 checkboxes (live-now + standards-read), rate limits 3/email/7d + 1/domain, post-submit "in review, typically 24h" + queue position.
- DATA: prisma Submission model (email, websiteUrl, domain, name, tagline, description, categorySlug, tags, pricing*, hasApi, github/docs/twitter, logoEmoji/logoGradient, isOwner, confirmedLive, agreedStandards, status, reviewNote) + 3 indexes. `bun run db:push` synced.
- ⚠ RUNTIME QUIRK (solved): long-running `next dev` kept a PRE-generation PrismaClient cached on globalThis → `db.submission` undefined even after `db:push` regenerate (Turbopack node_modules cache). Workaround: all Submission queries implemented as $queryRaw helpers in lib/prother.ts (findActiveSubmissionByDomain / countSubmissionsSince / createSubmission / pendingQueuePosition) — model-independent, table exists in SQLite. lib/db.ts now self-heals (recreates singleton if the cached client lacks `submission`). After a real dev-server restart these helpers can be swapped back to the ORM (they behave identically).
- API: POST /api/submit (zod full payload validation incl. live-now/standards literal(true), URL normalization, 1-per-domain → 409 with {kind:'tool'|'submission'} interstitial data, 3/email/7d → 429, OSS→GitHub → 422; 201 → {id, position}); GET /api/submit/check?url= (Step-1 blur dup check against seeded tools AND pending queue). lib/submit.ts = client-safe constants (TAG_VOCAB §13 vocab, GRADIENTS, LOGO_EMOJIS, PRICING_MODELS, INITIAL_SUBMIT_FORM, validateStep per-step mirror of server rules).
- UI submit-wizard.tsx (Dialog, mounted once in page.tsx):
  - 5 steps w/ segment progress bar + mono STEP 0x/05 + per-step subtitle; sticky footer nav (Cancel/Back ↔ Continue/Submit with loading state); disabled Continue when domain already queued.
  - Live-preview right rail (lg+): feed-row mock (emoji+gradient logo, name, tagline placeholder "Say what it does in the first 5 words", SUBMITTED BY YOU badge, category/pricing/domain meta line), pricing card, QUALITY BAR reminder — updates every keystroke.
  - Step ① URL/name/email/isOwner + duplicate interstitial banner (amber, ▲votes · listed by @maker, "This is my product → View it" opens the tool modal; "It's a different tool → Continue").
  - Step ② tagline w/ live counter + ember fill bar (red >60), description textarea, 2-col category radio grid with helpers, tag chips (max 5, dimmed beyond).
  - Step ③ pricing radios (Free/Freemium/Paid/OSS + helpers), price+note fields hidden for free/OSS, API checkbox, GitHub/Docs/X inputs (GitHub required for OSS).
  - Step ④ emoji logo picker (20) + gradient picker (12, swatch buttons) — stand-in for Phase-2 media upload, disclosed in copy.
  - Step ⑤ summary grid + the two PRD checkboxes (S1 live-now, S1–S6 standards link scrolls to #standards) → Submit.
  - Success screen: spring check icon, "Queued for review", copy per PRD ("typically within 24h", "72h notice + launch kit"), QUEUE #N + mono TICKET (id slice), Done / Submit another.
- CTA rewiring (submitOpen in explorer-store): header button (desktop+mobile menu), feed footer button, tomorrow note link, mobile sticky bar, final-cta outline button ("BUILT SOMETHING? SKIP THE LINE —"), ⌘K palette "Submit your tool" action — ALL open the wizard now (previously scrolled to waitlist). #submit section keeps waitlist + adds the wizard CTA.
- NEW ?tab= persistence: feed tab initial value reads URL (?tab=top|tomorrow|yesterday), setTabSync replaceStates it (deleted for "new"). Verified: /?tab=tomorrow → 4 teasers; click Yesterday → ?tab=yesterday; reload restores tab + rows.
- Styling details: ember focus rings (global), segment progress, mono labels w/ right-aligned hints, checkbox cards with ember fill on checked (data-[state=checked]), gradient swatch active ring, sticky wizard footer with backdrop-blur, success stat cards.
- QA: full happy path walked in browser (5 steps → 201 → success #1); validation errors verified (both confirm checkboxes); 409 interstitial path verified live (submitted with seeded promptly.ai domain → bounced to Step 1 with banner + toast); check API: tool-domain → kind:tool, queued-domain → kind:submission, fresh → null. Mobile 390px: wizard opens from sticky bar, docsw 390, ?tab= restore works. Test submissions removed from DB (2 rows). QA artifacts qa/45–49.
- lint 0 errors; dev.log clean (POST /api/submit 201, GET / 200); stale "domainOf" compile error artifact cleared via route re-touch (issue badge gone).

Stage Summary:
- Track B is live end-to-end: founders submit via the PRD §11 wizard (5 steps, live preview, dup interstitial, rate limits, confirm gates) into a persisted moderation queue with position tracking — closing the last major P0 gap in the landing scope.
- All conversion surfaces now lead to the wizard; feed state (?tab=) joins ?cat= and #tool= as shareable URLs.
- Risks/next: (1) dev-server-restart would let the $queryRaw shim be replaced by ORM calls (cosmetic); (2) PRD auth gate before Step 1 is approximated by email field (note in worklog; NextAuth exists in stack if wanted); (3) editor review queue UI (approve/reject/schedule) is the natural admin follow-up — data model already supports it via status/reviewNote; (4) seeded fictional URLs still pending swap before prod.

---
Task ID: 9
Agent: main orchestrator (Z.ai Code)
Task: webDevReview cycle #5 — Editor review console (PRD §12 adaptation) closing the Track-B loop: submit → review → approve → Tomorrow teaser

Work Log:
- Assessment: server healthy (feed 12 today / 4 tomorrow / 3 yesterday), no overflow, no console errors → stable. This cycle: the natural next step from Task 8 — the editor/moderation side of the submission pipeline.
- NEW APIs (both gated by demo passcode header x-editor-key, EDITOR_KEY="ember-dev" — documented stand-in for Phase-2 NextAuth):
  - GET /api/editor/queue → pending submissions oldest-first (PRD fairness) + counts + capacity {today, tomorrow, floor:5, cap:15} (PRD §12 capacity chip model).
  - POST /api/editor/decision → approve | reject (zod discriminated union). Approve: Submission → Tool (slug via slugifyName + uniqueToolSlug -2/-3 dedupe, track=community, claimed=isOwner, maker @email-prefix, verifiedAt=now) + Launch scheduled for TOMORROW UTC midnight → appears as a teaser immediately, goes live at rollover. Reject: status=rejected + reviewNote "Failed: S1, S4 — note" (PRD §7 "rejections must cite failed standard(s)"). 401 wrong key · 404 unknown id · 409 already-decided.
  - Submission table access stays on $queryRaw helpers (stale-PrismaClient workaround, see Task 8); Tool/Launch/Category via normal ORM (present in pre-generation client).
- NEW editor-console.tsx (Dialog, mounted once in page.tsx):
  - Passcode gate (mono input + click-to-fill demo key hint, sessionStorage "prother_editor_key").
  - Header chips: 🟢/🟡/🔴 TODAY n/cap · TMRW n/cap · PENDING n (live after every decision).
  - Pending cards: emoji/gradient logo, OWNER vs 3RD PARTY badge, domain + "Nh in queue", expandable detail (description, category, pricing, email, tag chips, Visit site ↗), S1–S6 reviewer strip (self-declared S1/S3 show emerald checks, rest dashed), Approve → schedule tomorrow (ember) / Reject… panel with 6 S-checkbox chips + note + "Reject with N citations" (disabled until ≥1 cited).
  - After any decision: queue reload + window.dispatchEvent("prother:feed-refresh") → use-feed listens and refetches, so Tomorrow counts update LIVE without reload.
- use-feed.ts: added prother:feed-refresh listener (module cache bust via fetchFeed(true)).
- Footer: real "EDITOR ACCESS" mono button (bottom bar, ⌘⇧E shortcut also opens the console); footer "Submit your tool" / "For makers" links now open the §11 wizard instead of dead-ends.
- BUGS fixed during self-QA: (1) missing db import in queue route (ReferenceError); (2) $queryRaw returns SQLite booleans as true/false, not 1/0 → normalized in queue API + client type/comparisons (OWNER badge was wrong) + decision route (claimed/hasApi via Boolean()); (3) approve created Launch with launchDate=todayStart + scheduled=true → invisible in BOTH today and tomorrow windows; fixed to tomorrowStart (+ one-off DB fix for DriftBoard).
- VERIFIED END-TO-END (browser): submitted DriftBoard via /api/submit → console showed card (chips 🟡 TODAY 12/15 · TMRW 4/15 · PENDING 1) → Approve → toast + queue clear → TMRW chip 5/15 → Tomorrow tab lists "Turbine, LingoLoop, Verity, CanvasOps, DriftBoard" → GET /api/tools/driftboard 200 (community listing, @mira, QUALITY BAR 0/6 PENDING until rollover = PRD-consistent). Reject path: QuickNote (a waitlist-violating S1/S4 submission) → Reject panel with S1+S4 cited → DB row status=rejected, reviewNote="Failed: S1, S4". 404 on unknown id. Test row cleaned; DriftBoard intentionally kept as demo of the loop.
- QA artifacts qa/50–54 (gate, queue, expanded card, reject panel, tomorrow-with-approved).
- lint 0 errors; dev.log clean; docsw 1280/390 both clean. Known cosmetic: Next dev-overlay "1 Issue" badge shows a STALE compile-error artifact ("domainOf doesn't exist in prother.ts") — the import was fixed in cycle #4 and every route returns 200; Turbopack keeps the phantom in its issue list until a dev-server restart flushes it. No user-facing impact.

Stage Summary:
- The moderation pipeline is now complete and CLOSED-LOOP: maker submits (§11 wizard) → editor reviews (S1–S6 audit strip) → approve → Tool+Launch created → teaser in Tomorrow → auto-live at 00:00 UTC rollover; or reject with cited standards → reviewNote persisted for the maker email.
- Prother now exercises the full PRD §8 dual-track supply model (editor seed + community submit) on a single landing route: feed, detail modals, ⌘K, wizard, and console all share one zustand store and design system.
- Risks/next: (1) demo passcode auth — swap for NextAuth before any real deployment (documented); (2) dev-overlay phantom issue flushes on dev-server restart (also re-caches PrismaClient fresh — the $queryRaw shims can then be swapped back to ORM if desired); (3) rejected-submission status tracking for makers (PRD §11 "status tracking") is a natural Phase-2 UI; (4) DriftBoard tool kept as approved-demo data — remove if unwanted (slug driftboard).

---
Task ID: 10
Agent: main orchestrator (Z.ai Code)
Task: webDevReview cycle #6 — Maker status tracking (PRD §11) + "More like this" in tool modal + ?cat= auto-scroll

Work Log:
- Assessment: server healthy (feed 12 today / 4 tomorrow / 3 yesterday), no page errors, only the known Turbopack phantom `route.ts:3:1` (routes all return 200 — memory artifact, flushes on dev-server restart). Stable → new-feature cycle. Chose the natural next step from Task 9: closing the MAKER side of the loop (editors had a console; makers had nothing after "Queued for review").
- NEW API GET /api/submit/status?email= (zod email, lowercase/trim) → {items: SubmissionStatusItem[]}. lib/submit.ts gained the client-safe type (status pending/approved/rejected, queuePosition, toolSlug, launchDate, live, reviewNote). lib/prother.ts gained listSubmissionsByEmail(): $queryRaw for submissions (stale-client workaround per Task 8) + queue snapshot for 1-based positions + Tool domain-matching (domainOf(websiteUrl)) to resolve approved → toolSlug/launchDate; live = launchDate <= now.
- NEW status-tracker.tsx (Dialog, mounted once in page.tsx): email lookup form (Enter/⌘), skeleton loading, result cards with gradient thumb + name + tagline + mono DOMAIN · SUBMITTED <rel-time>; status chips: IN REVIEW (amber, animate-ping dot + QUEUE #N) / GOES LIVE <date> (ember) / LIVE NOW (emerald) / REJECTED (red); rejected cards render parseReviewNote("Failed: S1, S4 — note") as citation chips + note + resubmit hint; approved cards get PREVIEW/VIEW LISTING → closes tracker, openTool(slug); empty state (dashed border, Inbox icon, "Submit your tool" CTA into the wizard); localStorage prother_track_email remembers the last lookup and AUTO-lookups on reopen; wizard success screen "Track this submission" hands off prefill via store (trackOpen/trackEmail in explorer-store).
- ENTRY POINTS: ⌘K Actions group ("Track my submission", MailSearch icon), footer Product column ("Check submission status"), wizard success screen. All share the store action.
- TOOL MODAL "MORE LIKE THIS": /api/tools/[slug] now returns related[] (up to 3 LIVE same-category tools, baseUpvotes desc, excludes self; scheduled teasers excluded). ToolDetailResponse gained optional related + RelatedToolRow type. Modal section: mini rows (gradient thumb, name, ▲votes, tagline, ArrowUpRight) with ember hover ring; click swaps the modal to that tool (key={slug} refetch); header row has "ALL <CATEGORY> →" cross-link = close modal + setCategoryFilter + smooth-scroll to #feed (verified: hash cleared, ?cat= set, scrollY 1844, dialog gone).
- ?cat= RESTORE AUTO-SCROLL (Task 7 leftover): URL-restore effect now also smooth-scrolls to #feed after 500ms (a shared ?cat= link is an intent to browse). Verified: load /?cat=audio-voice-music → feed section lands at top (feedTop 0).
- QA (agent-browser): approved path (mira@driftboard.dev → GOES LIVE Sep 20 card → PREVIEW LISTING → DriftBoard modal opens, tracker closed); pending path (test row via API → IN REVIEW · QUEUE #1; row deleted after); empty state; native email validation; palette + footer + all entries; related section (Promptly → NectarSearch 312▲; category has 1 live tool); "ALL" cross-link; ?cat= scroll; mobile 390px: docsw 390 (no overflow), tracker fits, related renders. Screenshots qa/55–58.
- lint 0 errors; dev.log clean (GET /api/submit/status 200). DB untouched except one deleted QA row.

Stage Summary:
- The PRD §11 loop is now closed on BOTH sides: makers submit → track (queue position / launch date / cited rejections) → preview their listing the moment it's scheduled; editors approve/reject from the console. The tool modal cross-links into category browsing ("More like this" + "ALL <category>"), tightening the discovery graph.
- Risks/next: (1) Turbopack phantom issue in dev overlay persists until dev-server restart (routes verified 200 — cosmetic only); (2) email-only tracker lookup is auth-lite — NextAuth (Phase 2) would gate accounts + history; (3) submission → approved-tool link is still domain-matched (no FK) — a submissionId column on Tool would make it exact; (4) seeded fictional external URLs still pending swap before prod; (5) candidate next: launch-day calendar view, OG image route for #tool links, rejected-resubmit prefill (clone form from a rejected submission).

---
Task ID: 11
Agent: main orchestrator (Z.ai Code)
Task: webDevReview cycle #7 — Dynamic OG images + server-side unfurl metadata (?tool=) + rejected-resubmit prefill + styling details

Work Log:
- Assessment: server healthy (GET / 200, /api/feed 200: 12 today / 5 tomorrow / 3 yesterday / 414 subs), lint 0 errors, dev.log clean, browser QA: 12 feed rows, no overflow (1280), no console errors → stable → new-feature cycle.
- NEW — Dynamic OG images (next/og ImageResponse, 1200×630):
  - GET /api/og → branded site card ("Where AI products launch._" hero type, ember glow, mono labels); GET /api/og?tool=<slug> → per-tool launch card (gradient logo tile + emoji, LIVE/GOES-LIVE mono kicker, name, tagline, category chip + votes chip, ember bottom rule). Data via db.tool.findUnique (launch + votes count + category); unknown slug gracefully falls back to the site card.
  - src/lib/og.ts: GRADIENT_HEX map (12 Tailwind gradient classes → real hex stops, satori can't read classes), OG_COLORS palette, clamp() for satori-safe truncation.
  - Satori quirks handled: flexbox-only layouts, monochrome-safe emoji inside gradient tile, "▲" glyph missing in mono font (dropped), bottom bar rebuilt as flat space-between row (nested flex column made the right text wrap vertically at the edge — caught by visual diff of the PNG).
- NEW — Server-side unfurl metadata for shareable tool links:
  - Hash deep links (#tool=) can't reach the server, so ?tool=<slug> is now the CANONICAL share form: page.tsx generateMetadata reads searchParams, fetches the tool, emits per-tool <title>, description (category + votes + description via clamp), og:image /api/og?tool=slug, twitter:card summary_large_image. Verified via curl: full og:/twitter: meta set on /?tool=promptly.
  - layout.tsx: metadataBase added + default openGraph/twitter images → /api/og.
  - tool-explorer.tsx: mount effect opens the modal from ?tool= as well, then normalizes the URL to the hash form (replaceState keeps ?cat=/?tab=, drops ?tool=) so the address bar matches in-app navigation; DetailBody shareUrl (Copy link + X intent) now emits the canonical ?tool= form — verified in the X intent href.
- NEW — "Resubmit with fixes" (rejected submissions → wizard prefill, PRD §11 loop closure):
  - lib/submit.ts: SubmitPrefill type (email + all wizard fields minus confirm checkboxes — maker must re-attest); SubmissionStatusItem gains resubmit (rejected only).
  - listSubmissionsByEmail now selects the full form columns and builds the prefill (tags CSV → vocab-filtered ≤5, pricingModel validated with freemium fallback, hasApi via Boolean()).
  - explorer-store: submitPrefill state; setSubmitOpen(open, prefill?) — plain opens (header CTAs, palette) always start fresh, close always clears, so a stale draft never leaks.
  - status-tracker ResultCard: RESUBMIT WITH FIXES button (red-bordered, arrow slide hover) → closes tracker → opens wizard prefilled; submit-wizard applies the draft on open (toast "Draft loaded — Pre-filled from your rejected <name> submission", step 1, dup-check state reset).
  - E2E verified in browser: submission → editor reject (S1+S4 cited) → tracker lookup → RESUBMIT WITH FIXES → wizard prefilled (URL/name/email/tagline/description/category radio coding-tools all correct, toast shown, confirms unticked) → QA row deleted from DB afterwards.
- STYLING DETAILS: tool modal banner gets a radial ember glow + dot-grid texture overlay (both pointer-events-none, aria-hidden); footer brand column gets ⌘K SEARCH / ⌘⇧E EDITOR kbd chips (hover→ember) for shortcut discoverability; OG cards themselves are new branded visual artifacts (saved to qa/).
- QA artifacts qa/59–63 (modal banner glow, footer kbd chips, OG site card, OG tool card, mobile-390 deep link).
- Verified: lint 0 errors; dev.log clean (GET /, /api/feed, /api/tools/*, GET /?cat=… all 200; no runtime errors); browser errors empty; ?tool= + ?cat= combo works (modal opens, ?tool= stripped, ?cat= preserved, hash normalized); mobile 390px docsw=390 no overflow; true-reload /#tool=pixelforge still opens only the tool modal (hash path unaffected); DB left clean (only QA submission removed).

Stage Summary:
- Sharing is now real: every tool has a canonical ?tool= link that unfurls with a custom-designed OG card on social/IM platforms, plus the branded site card as default. Copy-link and X-share emit the unfurlable form.
- The PRD §11 maker loop is fully closed: submit → track → (rejected) → RESUBMIT WITH FIXES re-opens the wizard pre-filled → re-review.
- Risks/next: (1) OG font is satori's bundled default (not Geist) — close enough visually; a custom font file could be loaded via ImageResponse fonts option if brand fidelity matters later; (2) generateMetadata makes the root route dynamic (fine for this scope); (3) seeded fictional external URLs still pending swap before prod; (4) candidate next: launch-day calendar view, submissionId FK on Tool (exact approved-linking), NextAuth gating, editor-queue real-time updates.

---
Task ID: 12
Agent: main orchestrator (Z.ai Code)
Task: webDevReview cycle #8 — Launch-week archive (browsable day strip + /api/feed/day) + Tool.submissionId FK integrity + db.ts schema-version guard

Work Log:
- Assessment: server healthy (12 today / 5 tomorrow / 3 yesterday / 414 subs), lint 0 errors, dev.log clean, browser QA: 12 rows, no overflow, no console errors → stable → new-feature cycle (from Task 11's candidate list).
- NEW — Launch-week archive (generalizes the Yesterday tab into a browsable week):
  - GET /api/feed now returns `weekDays: WeekDay[]` — the past 6 UTC days (oldest → newest) with {date, label, weekday, count} of non-scheduled launches (one lightweight launch.findMany + in-memory bucketing).
  - NEW GET /api/feed/day?date=YYYY-MM-DD (DayArchiveResponse) — one past day's final standings: validates format/403 for today-or-future/403 beyond the 6-day window; merges anon votes; votes-desc ranking; no-store.
  - Feed UI: the "Yesterday" tab is now "Archive (N)" (mobile "Arch. (N)", ?tab=yesterday key unchanged for compat). When active, a PAST 6 DAYS strip renders above the ARCHIVE rule: day chips with weekday·label·heat-dot·count (heat dot = ember for count>0, ring at ≥2), selected chip ember-filled, click toggles selection, re-click returns to yesterday default. Selected day's rows fetch once from /api/feed/day and cache in dayCache; ARCHIVE header shows the selected label ("ARCHIVE · SEP 17 · …"); footnote adapts ("Final standings for this UTC day." vs winner-email copy); empty state covers zero-count days ("No launches on Sep 13."); skeleton row shown while fetching; dayCache + selection reset on UTC rollover (feed.date change). Category filter applies to archive days too.
  - STYLING: archive rank #1 gets a 👑 DAY WINNER chip (amber) + gold-tinted card frame; day chips are mono with tabular-nums counts and active:scale-95.
- FIX — Data integrity: Tool.submissionId @unique column (nullable, editor-seeded tools have null):
  - prisma/schema.prisma + db:push (column verified).
  - Editor approve route now writes the FK via $queryRaw UPDATE (Tool.submissionId = submission.id).
  - listSubmissionsByEmail resolves approved → tool via the FK FIRST ($queryRaw JOIN; SQLite ms-epoch launchDate normalized), domain-match kept as fallback for pre-column tools. E2E verified: submit → approve → Tool row carries submissionId → tracker returns toolSlug/launchDate via FK → test rows cleaned (feed counts back to 12/5/8).
  - PrismaClient runtime lesson (documented in code): `db:push` regenerates node_modules client, but a long-running dev server's require cache keeps binding the PRE-generation runtime — a fresh `new PrismaClient()` still uses the old datamodel, so new fields are ORM-unusable until process restart. First attempt hit "Unknown field `submissionId`" (500 on /api/submit/status) → switched the read to $queryRaw. lib/db.ts now also guards with a SCHEMA_VERSION marker (self-heal re-evaluates on module reload; swap raw→ORM after a real dev-server restart).
- STYLING DETAILS: day-strip heat dots + selected ember fill + UTC DAYS caption; DAY WINNER gold frame; archive header/toggle copy updated ("← Launch-week archive · Sep 18 [3]").
- QA artifacts qa/64–66 (mobile tabs+strip, desktop strip with winner, mobile day chips).
- Verified: lint 0 errors; dev.log clean (all 200s; the one mid-cycle 500 was the stale-client probe, fixed + documented); browser errors empty; /?tab=yesterday restore works; vote toggle regression 48→49→48 (net zero, DB clean); archive day switching (Sep 17 → StackSherpa/EchoGrain + winner chip; Sep 13 zero-day empty state; deselect → SEP 18 default); mobile 390px docsw=390; FK E2E + full cleanup (tomorrow back to 5).

Stage Summary:
- The feed now covers the full launch week as first-class history: any of the past 6 days is browsable with locked final standings, day winners are celebrated, and the archive participates in category filtering — "what launched, what's climbing" now extends to "what launched this week, day by day".
- Submission↔Tool linking is exact (FK), removing the domain-collision caveat in the maker tracker; the PrismaClient staleness trap is documented and guarded.
- Risks/next: (1) ORM still binds the pre-generation client until dev-server restart — Submission queries + submissionId stay on $queryRaw (behavior identical); (2) Turbopack dev-overlay "1 Issue" badge remains a phantom of earlier compile/error artifacts until restart (routes verified 200); (3) day strip has no today/tomorrow chips (back-link + tabs cover it; could add for symmetry); (4) candidate next: launch-day calendar view beyond 6 days needs seed/schema depth (archive retention policy), NextAuth gating, editor-queue live updates, OG font fidelity.

---
Task ID: 13
Agent: main orchestrator (Z.ai Code)
Task: webDevReview cycle #9 — BUGFIX ?tab= hydration mismatch + Launch Discussion (comments) + RSS feed + footer polish

Work Log:
- Assessment: server healthy (12 today / 5 tomorrow / 3 yesterday / 414 subs), lint clean. Browser error log surfaced a REAL bug: `?tab=top` deep links produced React hydration mismatches on every load (reproduced: each /?tab=… load added exactly +1 "Hydration failed" error; baseline and ?cat= were clean).
- BUGFIX — hydration mismatch: launch-feed.tsx read `window.location.search` for ?tab= inside a useState initializer → SSR rendered "New" tab, client rendered the URL tab → mismatch. Moved the URL read into a post-mount useEffect (SSR-safe; one-frame default-tab flash is invisible in practice). Verified: repeated /?tab=top + /?tab=yesterday loads now add ZERO errors.
- HARDENING — LaunchFeed array access: `feed?.tomorrow.length` (optional chain stops at feed) and unguarded `feed.top/new/yesterday/tomorrow` in the rows memos could throw on any shape drift (2 stale TypeErrors of exactly this class were sitting in the error buffer). All accessors now `?.length ?? 0` / `?? []`; category filters compare `r.category?.slug`. Error log after all fixes + full QA session: EMPTY.
- NEW — Launch Discussion (comments on tool listings):
  - Prisma `Comment` model (toolId FK cascade, author 2–24, body 4–280, isMaker, createdAt, @@index([toolId, createdAt])) + db:push. ORM-unusable on the long-running dev server (stale-client note) → all access via $queryRaw helpers in NEW lib/discussion.ts (listComments ASC ≤200, createComment RETURNING, commentCountsByTool via Prisma.join IN, lastCommentAgeSec for a 15s per-author/tool throttle → 429). SQLite epoch/string datetimes normalized to ISO in toIso.
  - NEW GET+POST /api/tools/[slug]/comments (zod: name 2–24, body 4–280; 404 unknown slug; 422 validation message; 429 throttle). isMaker derived server-side: author === makerHandle (± leading @, case-insensitive). curl-verified: 201 / 429 / 422 / maker-detect all correct.
  - Feed integration: FeedRow.comments?: number; shared attachCommentCounts(rowSets, slugToToolId) helper in prother.ts (lazy import avoids cycle) wired into /api/feed (today + yesterday rows) and /api/feed/day. Feed row meta line renders a 💬 MessageSquare count chip when >0 (white/55 → ember on row hover).
  - Modal UI: NEW Discussion component in tool-explorer.tsx, mounted between QUALITY BAR and MORE LIKE THIS. Header "DISCUSSION (N)" + "MODERATED PER S6"; comments as cards with deterministic per-author gradient avatars (hash → 8 ember-family gradients), MAKER ember chip, relative timestamps (just now/Xm/Xh/Xd), framer-motion fade-up entrance; list capped max-h-96 overflow-y-auto aria-live=polite; skeleton rows while loading; error state; dashed empty state ("ask @maker anything").
  - Composer: mono name input (remembered in localStorage prother_comment_name), auto-growing-capped textarea with ⌘/Ctrl+↵ submit, live char counter (white/35 → ember at 224 (80%) → red at 280 cap, aria-live), Post button with Loader2 "Posting…" spinner → emerald "Posted" flash → toast; optimistic append from the 201 response; disabled until name ≥2 + body ≥4.
- NEW — RSS: GET /api/rss → RSS 2.0 of today's UTC batch (▲-votes + category + maker descriptions, ?tool= canonical links, atom:link self); footer Resources column gained "RSS feed" link; layout metadata alternates.types adds RSS auto-discovery. curl: 200, application/rss+xml, valid XML with 12 items.
- Seed: prisma/seed-comments.ts (idempotent, ORM — separate process so fresh client) → 8 starter comments across Promptly (incl. @dana MAKER AMA), CodePilotX (maker reply), PixelForge, NectarSearch, DriftBoard.
- STYLING DETAILS: ember counter thresholds, focus-within ember border on composer, hover ember tint on comment cards + feed badges, skeleton/loading/error/empty states, ⌘↵ + S6 mono microcopy, shrink-0 nowrap timestamps (mobile edge safety).
- QA (agent-browser): post-comment E2E via UI (DISCUSSION 3→4, comment renders last with "just now", name remembered); counter tone flips at 80% (verified 230/280 → ember); 💬 chips on feed rows (Promptly 3 / CodePilotX 2 / PixelForge 1); ?tab=top restore + footer RSS link present; mobile 390px: docsw=390, discussion + composer fit (qa/69); tool deep link ?tool=promptly opens modal with discussion. Screenshots qa/67–69. Final error log: EMPTY; lint 0 errors; dev.log clean (all 200s); DB clean (QA comment deleted, 8 seeded remain).

Stage Summary:
- The listing modal is now a social surface: every launch carries its own discussion thread with maker participation badges, and the feed previews discussion size as first-class social proof next to votes.
- Fixed the last reproducible client error (hydration) and hardened the feed against shape drift — the browser error log is now empty across deep-link, modal, mobile, and comment-posting flows.
- Risks/next: (1) comments are auth-lite (display name + 15s throttle) — NextAuth identity would unlock edit/delete and real moderation tooling (S6 currently enforced only by validation caps + microcopy); (2) comment counts ride on /api/feed freshness (no-store, fine at this scale); (3) seeded fictional external URLs still pending swap before prod; (4) candidate next: maker reply notifications (tracker already has email), comment moderation view in the editor console (flag/report), live "happening now" ticker via a socket mini-service, launch-day calendar beyond the 6-day archive (needs seed depth).

---
Task ID: 14
Agent: main orchestrator (Z.ai Code)
Task: user request — (1) compare try.cloudflare.com hero animations + design tokens vs Prother and adopt the gaps; (2) fix Cloudflare Pages deployment (deprecated @cloudflare/next-on-pages → @opennextjs/cloudflare on Workers)

Work Log:
- ANALYSIS — fetched live https://try.cloudflare.com/ and extracted its full animation/token DNA from the inline CSS: 6 keyframes (lineIn .22s ease-out translateY(4px); caret steps(1) 1s; pulse 2s opacity .3; marquee translateX(-50%); dash stroke-dashoffset→-32 with dasharray 8 8; floatY ±6px 5s), tokens (--ink #0b0d12, --paper #f4f1ec, --brand #f6821f, --brand-hover #ffa24d, --brand-tint #ffb877, --success #3fcf8e, 4-step hairline ramp rgba(paper,.08/.12/.14/.2), Inter + JetBrains Mono), plus prefers-reduced-motion overrides and SVG rays (motion lib). Comparison: our hero already mirrored structure (pill/h1/terminal/rings/marquee) but terminal lines were static, dot static, rays were inert divs, cursor used smooth animate-pulse instead of steps(1), and no floatY/reduced-motion guards.
- CF DEPLOY FIX — root cause: @opennextjs/cloudflare@1.20.x requires next >=16.3.3 for the v16 line; repo was on 16.1.1 (why the Pages deploy failed). Upgraded next + eslint-config-next → 16.3.5 (peer now satisfied). Installed @opennextjs/cloudflare@1.20.6 + wrangler@4.135.0 (devDeps). Added wrangler.jsonc (main .open-next/worker.js, assets binding ASSETS, nodejs_compat + global_fetch_strictly_public, observability, commented D1/KV slots), open-next.config.ts (defineCloudflareConfig), next.config.ts (standalone output dropped when NEXT_OUTPUT=cloudflare; optional dev-bindings proxy guarded by NEXT_CF_DEV=1 via dynamic import so sandbox dev stays lean), package.json scripts cf:build/cf:preview/cf:deploy/cf:typegen, .gitignore .open-next/.wrangler, DEPLOY.md (commands, custom domain, typegen, Windows note, Prisma/SQLite-on-Workers blocker with D1/Turso/split-host options, KV/R2 cache upgrade path). Verified config loads on dev ("Running next.config.ts took 43ms").
- HERO ANIMATION LAYER (globals.css) — ported CF's keyframes with our ember identity: line-in, caret-blink (steps(1)), status-pulse, float-y, dash-march + utility classes .term-line/.animate-caret/.animate-status-pulse/.animate-float-y/.flow-dash; new tokens --color-ember-tint #FFB877 (≈CF brand-tint) and --color-mint #3FCF8E (≈CF success); extended prefers-reduced-motion block (term-line forced visible, all new animations off) mirroring CF's accessibility pattern.
- HERO (hero.tsx) — terminal lines now stagger in via .term-line + animationDelay .05→1.2s (CF lineIn cadence); caret block swapped animate-pulse → .animate-caret (harsh steps blink); announcement dot → .animate-status-pulse; NEW HeroRays SVG (12 dashed rays radiating from the glow center, dasharray 8 8 marching via dash-march, alternating opacity) replacing the static-dash-only backdrop; terminal panel wrapped in .animate-float-y breathe (hover pauses it, entrance slide kept on outer motion.div so transforms don't fight).
- BUGFIX — hydration mismatch in HeroRays: raw trig coordinates differed in far decimals between server/client FPUs (y1 …426 vs …423) → React 19 hydration error ("1 Issue" dev-overlay badge). Fixed by rounding all line coords to 2 decimals. Verified: badge gone, browser error log EMPTY across desktop/mobile/deep-link loads.
- QA — restart note: killed the boot-time dev server with pkill (mistake) and discovered tool-call processes are reaped in this sandbox; fixed persistence via double-fork daemonization (survives across calls). Browser QA: desktop hero (qa/70) with marching rays + staggered terminal + live feed data (Promptly #1, 414 subs); mobile 390px (qa/71–73) — layout intact, ?tab=top restores Top tab (ember pill), countdown + TOP WEEK render; desktop footer (qa/74) natural bottom placement, no overlap; /api/feed + /api/rss 200; lint 0 errors; final browser error log EMPTY. New screenshots qa/70–74.

Stage Summary:
- Prother now runs the exact animation grammar of try.cloudflare.com (lineIn stagger, steps(1) caret, pulsing status dot, marching dashed SVG rays, floatY, reduced-motion guards) mapped onto the ember identity, plus the brand-tint/success token ramp.
- The Cloudflare deploy path is unblocked and modernized: Next 16.3.5 + @opennextjs/cloudflare targeting Workers-with-assets (Pages adapter is deprecated); one-command cf:preview/cf:deploy. The remaining known blocker for FULL-stack Workers deploys is Prisma+SQLite (no filesystem on workerd) — D1/Turso migration is the recommended next phase (documented in DEPLOY.md, bindings pre-reserved in wrangler.jsonc).
- Risks/next: (1) cf:build not executed in-sandbox (no build allowed here) — first real deploy should run bun run cf:preview locally; (2) DB-backed API routes will 500 on Workers until the D1/Turso migration lands; (3) candidate next: D1 adapter migration, OG font fidelity, NextAuth identity for comments/moderation, live ticker mini-service.

---
Task ID: 15
Agent: main orchestrator (Z.ai Code)
Task: user request — use the uploaded "Gateway Flow" component as the hero background animation, replacing the current backdrop, themed to Prother's ember/ink identity

Work Log:
- ANALYZED upload (Pasted Content_1789883633277.txt): 21st.dev Neuform "Gateway Flow" — an iframe wrapper (srcDoc + bake/focus/controls machinery) around a demo page whose GSAP/canvas section animates 80 dashed bezier streams converging on the center, particles riding the curves (t += 0.0015+rand*0.002), and click shockwaves (radius +=15, life -=0.015, ±120 falloff, deflect ×80). Original depends on CDNs (GSAP required before the canvas script even runs — fragile) and an iframe that would kill click interactivity as a hero background.
- NEW src/components/ui/gateway-flow.tsx — faithful self-contained port (no iframe/CDN): canvas + rAF, verbatim bezier/particle/explosion math, ember palette (paths rgba(255,106,0,.32), particles ember-hot, every 9th an ember-tint hot spark with shadowBlur glow; light-mode variant included). Knobs preserved from the source API: mode, speed (0–3, live via ref), size, density (0.25–2.5), opacity, hue/saturation/brightness (CSS filter), interactive, dither (2px checkerboard grain from the source design @ 0.05). Robustness upgrades over the source: DPR setTransform (no scale accumulation on resize), frame-rate-independent stepping (dt/16.7), IntersectionObserver pause off-screen, ResizeObserver, frac-based stream anchors (resize-stable, clamped ±drift vs. source's unbounded walk), prefers-reduced-motion → static frame + no shockwaves, window-level click listener filtered to component bounds (root is pointer-events-none).
- HERO swap — removed HeroBackdrop entirely (concentric rings, rotated dashes, HeroRays marching SVG, blur glows); hero now layers: radial ember convergence glow (50% 46%) → <GatewayFlow speed={0.9} density={0.85} opacity={0.9} className="absolute inset-0" /> → content. Removed the now-unused dash-march/.flow-dash CSS + reduced-motion reference; micro-animation layer (line-in/caret/status-pulse/float-y) kept for the terminal/pill/panel.
- QA — dev server still alive (double-fork daemon from Task 14 persisted); lint 0 errors; browser: desktop hero (qa/75) shows converging dashed ember streams + glowing particles + grain, text/terminal fully readable, error log EMPTY; shockwave test (qa/76) — click on h1 visibly scatters/bends nearby particles vs. 75; mobile 390px (qa/77) renders the flow cleanly with sticky Submit bar, no overflow, no errors. Note: UTC rolled to Sun, Sep 20 mid-QA → today's batch is 0 (hero terminal shows new-day state; by design — editor console/seed owns the daily batch).
- Not done on purpose: no new cron (webDevReview 15-min job 399292 already active from Task 14).

Stage Summary:
- The hero background is now the interactive Gateway Flow: launches-as-streams converging into one feed — a visual metaphor for Prother's tagline — in pure ember, dependency-free, accessible (reduced-motion), and performance-guarded (pauses off-screen).
- Risks/next: (1) canvas density could scale down further on very small screens if users report busy-ness (one-line knob); (2) the daily-batch rollover to Sep 20 means today's feed is empty until seeds/editor approval — candidate next cycle: refresh seed data for the new UTC day (or auto-seed via cron); (3) GatewayFlow is generic enough to reuse (e.g., final-cta section) with different density/speed.

---
Task ID: 16
Agent: main orchestrator (Z.ai Code)
Task: user request — (1) PRD gap audit ("what's left"); (2) plan + build a comprehensive Admin panel (site + frontend management); (3) Journal/blog feature with strong SEO

Work Log:
- PRD AUDIT — re-read the full PRD PDF (upload/) and mapped F-01..F-56, §9–12 screens and §20 milestones against the codebase. Built so far: homepage feed (F-01/04-lite/05-lite), tool explorer + ?tool deep links, submit wizard (F-21/22), status tracker, editor queue (F-26/F-33-lite), votes (F-14 anon), comments (F-42-lite), waitlist (F-45), RSS, OG images, standards page. Not built: real routes (/tool/{slug}, /category/{slug}, /launches/{date} — sandbox is single-route, hash/param pattern used instead), auth (F-37), reviews (F-16), claims (F-30), collections (F-39/40), re-launch (F-35), email digests (F-46/47), trending (F-06), comparisons (F-08), monetization (P2). Admin panel + blog selected as next (user priority).
- SCHEMA — prisma/schema.prisma: +Post (slug/title/excerpt/body markdown/coverEmoji+Gradient/category/tags/status draft|published/author/readingMinutes/views/seoTitle/seoDescription/keywords/publishedAt), +SiteSetting (KV for frontend copy), +AuditLog (action/entity/entityId/meta), Tool +status (draft→pending_review→approved→live→removed, soft-delete per §16) +pinned (0–3 editorial pin). db:push OK; prisma client regenerated.
- SEED — prisma/seed-cms.ts (idempotent): 6 published SEO-oriented posts (launch playbook, ranking algorithm explainer, directory SEO guide, maker FAQ, taxonomy design, launch-week recap — real bodies with markdown incl. fences/lists/quotes) + 6 SiteSetting defaults (hero.headline/subline/announcement, footer.note, seo.defaultTitle/Description).
- ADMIN BACKEND — src/lib/admin.ts (guard()/logAudit()); /api/admin/overview (13 KPIs + queue SLA + audit tail); /api/admin/tools (GET search/filter, PATCH all fields incl. verify:true → stamps verifiedAt, DELETE soft); /api/admin/schedule (GET 14-day grid + unscheduled pool, POST schedule/reschedule/unschedule with cap enforcement + upsert); /api/admin/categories (CRUD, delete blocked while tools attached); /api/admin/posts + /[id] (CRUD, publish stamps publishedAt, body-only-sent-when-rewritten, readingMinutes recompute); /api/admin/subscribers (stats + ?format=csv export with ?key= transport for downloads); /api/admin/settings (GET/PUT KV). All mutations write AuditLog. All admin routes 401 without x-editor-key (same EDITOR_KEY as editor desk).
- PUBLIC BLOG + SEO — /api/blog (published list) + /api/blog/[slug] (post + related; POST = view ping); /api/site (public settings); app/sitemap.ts (home + 5k tools + posts, honest lastmod); app/robots.ts (removed conflicting static public/robots.txt that 500'd the route); /api/rss?kind=journal (RSS feed for posts); /api/og?post= (Journal OG card 1200×630 matching tool cards); page.tsx generateMetadata ?post= branch (seoTitle/Description/keywords → metas, article OG with publishedTime/authors); lib/markdown.ts (dependency-free esc-first renderer: h2–h4, fences, lists, quotes, inline code/bold/italic/links) + .post-body typography in globals.css (ember ## prefixes, ember-bordered pre, md-code chips).
- FRONTEND — explorer-store +postSlug/adminOpen (openPost syncs ?post= + #post=; closePost cleans) — BUGFIX: initial values were missing (undefined), which made `postSlug !== null` true at boot → reader dialog auto-opened a stuck spinner on every load; fixed by adding postSlug: null, adminOpen: false. journal.tsx (id=journal, Blog JSON-LD, category chips, 6 cards, skeleton, RSS link); post-reader.tsx (fetch + related, derived loading state per new lint rule, document.title + meta description sync, BlogPosting JSON-LD injected/removed, copy-link share, view ping, tags, keep-reading grid); admin-console.tsx (~1500 lines, 8 tabs: Overview KPIs/audit, Queue quick approve/reject w/ S-citations, Calendar grid + pool scheduling, Listings search + inline editor (status/pin/badges/pricing/links/verify/soft-delete), Journal CRUD w/ SERP preview + SEO counters + publish/unpublish, Taxonomy inline edit + add + guarded delete, Subscribers stats + CSV export, Site copy editor + custom KV); header: Journal nav + gear button (⌘⇧A) + mobile items; footer: Journal/playbooks/RSS links + ADMIN kbd; hero.tsx consumes /api/site for announcement/headline/subline with locked defaults (headline last word renders ember).
- QA (agent-browser) — caught + fixed: lucide-react has no default export (Link2 named import); Tailwind dev cache needed a real content change for .post-body to compile; store init bug above. Flows verified: journal cards → reader (title sync, markdown typography qa/83, related), deep link /?post= auto-opens after reload, admin gate → unlock → all 8 tabs on desktop + mobile 390px, post create (toast, DRAFT chip) → delete (6 posts), settings announcement edit → /api/site reflects → reverted via PUT, audit trail shows admin.view/settings.update/post.create/post.delete, calendar chip/pill consistency fix, ?tool=promptly regression OK. qa/78–97. Lint 0 errors; final error log EMPTY (robots conflict resolved); page/sitemap/robots/rss-journal/post/og-post all 200; admin APIs 401 unauthenticated.
- Not done: cron not re-created (webDevReview job 399292 from Task 14 already active — no duplicate).

Stage Summary:
- Prother now has a full backstage: the Admin Console manages listings lifecycle, launch calendar + pool, submissions queue, taxonomy, subscribers (+CSV), the Journal, and the site's own frontend copy — all audited, all behind the shared admin key. The Journal is a real CMS-backed blog with drafts, publish flow, view counts, per-post SEO fields (SERP preview + length meters in the editor), Article/Blog JSON-LD, sitemap + robots + RSS + OG images, and deep-linkable ?post= URLs with server-side unfurl metadata.
- Risks/next: (1) admin/demo key is client-shared until NextAuth (P2) — rotate via EDITOR_KEY in lib/prother.ts; (2) Post editor edits metadata-only by default (body rewrite sends full markdown) — a proper rich editor with draft-body GET would be the upgrade; (3) blog lives on ?post= URLs while the sandbox is single-route — real /journal/[slug] routes should replace it post-sandbox (metadata plumbing already returns per-post data); (4) review editor body fetch: ListingEditor verify + queue SLA chips give F-18-lite; full re-verify automation still pending; (5) D1/Turso migration still the Workers blocker for all DB routes.
