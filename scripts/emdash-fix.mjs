/**
 * Task 31 — em-dash copy rewrite (user request: "Reserve the em dash ...
 * zero to one per long document"). Two layers:
 *
 * 1. TABLE: exact, hand-edited replacements for user-facing copy in src/
 *    (metadata titles → middot; toasts/errors → periods; elaborations →
 *    colons; asides → commas/parentheses; ALLCAPS labels → middot).
 * 2. RULES for prisma seed prose (rendered copy): paired dashes →
 *    parentheses, connective words → commas, elaborations → colons.
 *    Comments (//, *, /*, {*) are left untouched except table hits.
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const files = [];
function walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(n)) files.push(p);
  }
}
walk("/home/z/my-project/src");
walk("/home/z/my-project/prisma");

const TABLE = [
  // titles / metadata → middot or comma
  ["${a.name} vs ${b.name} — Compare AI tools | Prother", "${a.name} vs ${b.name} · Compare AI tools | Prother"],
  ["${c.name} — Curated collection | Prother", "${c.name} · Curated collection | Prother"],
  ["${cat.name} — AI tools, ranked | Prother", "${cat.name} · AI tools, ranked | Prother"],
  ["${category.name} — AI tools | Prother", "${category.name} · AI tools | Prother"],
  ["${tool.name} — ${tool.tagline} | Prother", "${tool.name} · ${tool.tagline} | Prother"],
  ["AI tools — search & compare | Prother", "AI tools · search & compare | Prother"],
  ["About Prother — the AI tools directory", "About Prother, the AI tools directory"],
  ["Admin — Prother", "Admin · Prother"],
  ["Forums — discuss building AI products | Prother", "Forums · discuss building AI products | Prother"],
  ["Submit your AI tool — Prother", "Submit your AI tool · Prother"],
  ["The Journal — Prother", "The Journal · Prother"],
  ["The Prother Journal — Notes from the directory", "The Prother Journal · Notes from the directory"],
  ["Prother — Find the right AI tool", "Prother · Find the right AI tool"],
  ["PROTHER — FIND THE RIGHT AI TOOL", "PROTHER · FIND THE RIGHT AI TOOL"],
  ["Prother — back to home page", "Back to the Prother home page"],
  ["${name} — Prother", "${name} · Prother"],
  ["${name} — full listing", "${name}, full listing"],
  ["Prother Journal — AI tool discovery", "Prother Journal · AI tool discovery"],
  ["${row.name} — ${row.tagline}. Open full listing.", "${row.name}: ${row.tagline}. Open full listing."],
  ["${t.name} — ${t.tagline}. Rank ${i + 1} in ${category.name}.", "${t.name}: ${t.tagline}. Rank ${i + 1} in ${category.name}."],
  ["Open ${r.name} — ${r.tagline}", "Open ${r.name}: ${r.tagline}"],
  ["Side-by-side comparison: ${a.name} (${a.tagline}) vs ${b.name} (${b.tagline}) — pricing, ratings, and features.",
   "Side-by-side comparison of ${a.name} (${a.tagline}) and ${b.name} (${b.tagline}): pricing, ratings, and features."],
  ["Placement inquiry — ${p.title}", "Placement inquiry: ${p.title}"],
  ["Edit — ${campaign.name}", "Edit: ${campaign.name}"],

  // toasts / errors / statuses → periods
  ["${d.updated} keys written — refresh to see it live.", "${d.updated} keys written. Refresh to see it live."],
  ["Comparison is full — remove a tool first", "Comparison is full. Remove a tool first."],
  ["Could not copy — select the tag manually.", "Could not copy. Select the tag manually."],
  ["Could not post — please try again.", "Could not post. Please try again."],
  ["Could not start sign-in — try again.", "Could not start sign-in. Try again."],
  ["Could not submit the review — please try again.", "Could not submit the review. Please try again."],
  ["Missing CSRF token — try again.", "Missing CSRF token. Try again."],
  ["Network error — please try again.", "Network error. Please try again."],
  ["Network error — try again.", "Network error. Try again."],
  ["Review posted — thanks!", "Review posted. Thanks!"],
  ["Sessions revoked — sign-ins dead.", "Sessions revoked. Sign-ins dead."],
  ["Slow down — try again in a few seconds.", "Slow down. Try again in a few seconds."],
  ["Something went wrong — try again in a moment.", "Something went wrong. Try again in a moment."],
  ["Something went wrong — try again.", "Something went wrong. Try again."],
  ["Thanks — our moderators will take a look", "Thanks. Our moderators will take a look"],
  ["The collection service didn't respond — try again in a moment.", "The collection service didn't respond. Try again in a moment."],
  ["The listing service didn't respond — try again in a moment.", "The listing service didn't respond. Try again in a moment."],
  ["Verification request failed — please try again.", "Verification request failed. Please try again."],
  ["Verified-at stamped — staleness clock reset.", "Verified-at stamped. Staleness clock reset."],
  ["Already reported — thanks", "Already reported, thanks"],
  ["Following — you'll see updates", "Following. You'll see updates."],
  ["Queue clear — nothing waiting.", "Queue clear. Nothing waiting."],
  ["Queue clear — nothing waiting for review.", "Queue clear. Nothing waiting for review."],
  ["Editor dismissed — ownership not established", "Editor dismissed: ownership not established"],
  ["Claim started — add the meta tag to your site.", "Claim started: add the meta tag to your site."],
  ["Claimant sees DISPUTED — they can re-claim with proof.", "Claimant sees DISPUTED and can re-claim with proof."],
  ["Listing approved — now live in the directory at /tool/${data.slug}.", "Listing approved and now live in the directory at /tool/${data.slug}."],
  ["Weekly limit reached — 3 submissions per email per 7 days.", "Weekly limit reached: 3 submissions per email per 7 days."],
  ["${tool.name} removed (soft — history kept)", "${tool.name} removed (soft delete, history kept)"],
  [" · SEO —", " · SEO ✕"],
  [" — ${input.note}", ": ${input.note}"],
  ['Failed: S1, S4 — note', 'Failed: S1, S4: note'],
  ['Failed: S1, S4 — optional note', 'Failed: S1, S4: optional note'],

  // hero / labels / chips → middot or comma
  ["Curated daily — 46 tools indexed across 7 categories", "Curated daily · 46 tools indexed across 7 categories"],
  ["Search ${indexCounts.tools} AI tools — try “translate video”", "Search ${indexCounts.tools} AI tools. Try “translate video”"],
  ["Directory banner — spring campaign", "Directory banner · spring campaign"],
  ["RSS — journal", "RSS · Journal"],
  ["My collections — sign in required", "My collections (sign in required)"],
  ["Name — e.g. Agent stacks", "Name (e.g. Agent stacks)"],
  ["Pin rank (0 = none — tops the directory)", "Pin rank (0 = none; 1 tops the directory)"],
  ["SEO description (≤160 — falls back to excerpt)", "SEO description (≤160, falls back to excerpt)"],
  ["SEO title (≤60 — falls back to title)", "SEO title (≤60, falls back to title)"],
  ["— will truncate in SERP", "(will truncate in SERP)"],
  ["${descLen}/500 — what it does, for whom, how it's AI-native", "${descLen}/500 · what it does, for whom, how it's AI-native"],
  ["${form.tags.length}/5 — controlled vocabulary", "${form.tags.length}/5 · controlled vocabulary"],
  ["${taglineLen}/60 — say what it does in the first 5 words", "${taglineLen}/60 · say what it does in the first 5 words"],
  ["${thread.replyCount} replies — open thread", "${thread.replyCount} replies · open thread"],
  ["© 2026 Prother — Curation is never sold.", "© 2026 Prother. Curation is never sold."],
  ["THE QUALITY BAR — PUBLIC AT /STANDARDS", "THE QUALITY BAR · PUBLIC AT /STANDARDS"],
  ["Traffic — last 14 days", "Traffic, last 14 days"],
  ["METADATA-ONLY EDITS KEEP THE STORED MARKDOWN — REWRITE THE BODY FIELD TO", "METADATA-ONLY EDITS KEEP THE STORED MARKDOWN · REWRITE THE BODY FIELD TO"],
  ["COOKIELESS FIRST-PARTY COUNTING (PATH × DAY — NO COOKIES, IPS OR", "COOKIELESS FIRST-PARTY COUNTING (PATH × DAY, NO COOKIES, IPS OR"],
  ["IMMEDIATELY · DEMO AUTH — PHASE 2 ADDS NEXTAUTH ROLES", "IMMEDIATELY · DEMO AUTH · PHASE 2 ADDS NEXTAUTH ROLES"],
  ["① SPOTLIGHT — YourTool", "① SPOTLIGHT · YourTool"],
  ["SPONSORED — YourTool", "SPONSORED · YourTool"],
  ["YourTool — one full-width card", "YourTool: one full-width card"],
  ["Listing live — view it", "Listing live · view it"],
  ["✓ Verified — this listing is yours.", "✓ Verified: this listing is yours."],
  ["Quality bar — {passedCount}/{detail.standards.length} passed", "Quality bar: {passedCount}/{detail.standards.length} passed"],
  ["Google — configure GOOGLE_CLIENT_ID to enable", "Google: configure GOOGLE_CLIENT_ID to enable"],
  ["No campaigns yet — create the first one", "No campaigns yet: create the first one"],

  // meta descriptions / blurbs → colons, commas, parens, periods
  ["A curated search & discovery platform for AI tools — 7 categories, six published listing standards, and honest reviews.",
   "A curated search & discovery platform for AI tools: 7 categories, six published listing standards, and honest reviews."],
  ["Every listing is indexed across seven categories — conversational AI, generative content, NLP utilities, computer vision, analytics, automation, and developer platforms — with honest pricing, real reviews, and side-by-side comparisons.",
   "Every listing is indexed across seven categories (conversational AI, generative content, NLP utilities, computer vision, analytics, automation, and developer platforms) with honest pricing, real reviews, and side-by-side comparisons."],
  ["Buyers browsing the whole shelf see it — nobody scrolling past it is interrupted.",
   "Buyers browsing the whole shelf see it. Nobody scrolling past it is interrupted."],
  ["Add a specific, honest take — what you did and what happened.", "Add a specific, honest take: what you did and what happened."],
  ["Anything that helps the moderators — links, context, what happened.", "Anything that helps the moderators: links, context, what happened."],
  ["Assistants and answer engines built on large language models — general-purpose chat,",
   "Assistants and answer engines built on large language models: general-purpose chat,"],
  ["Browse ${name} — a curated directory of live AI products in this category.",
   "Browse ${name}, a curated directory of live AI products in this category."],
  ["Collections, follows, and shareable stacks — keep the tools you rely on in one place.",
   "Collections, follows, and shareable stacks: keep the tools you rely on in one place."],
  ["Community moderation queue — hide content, resolve or dismiss with a note.",
   "Community moderation queue: hide content, resolve or dismiss with a note."],
  ["Community queue — approval publishes the listing, rejections cite standards.",
   "Community queue: approval publishes the listing, rejections cite standards."],
  ["Community roster — roles, bans and activity, sessions revoke on ban.",
   "Community roster: roles, bans and activity. Sessions revoke on ban."],
  ["earned through hands-on testing — never payment.", "earned through hands-on testing, never payment."],
  ["Free for users, forever — browsing, search, collections, and reviews.",
   "Free for users, forever: browsing, search, collections, and reviews."],
  ["From chatbots to developer platforms — a taxonomy built for how AI actually ships, not a junk drawer.",
   "From chatbots to developer platforms: a taxonomy built for how AI actually ships, not a junk drawer."],
  ["from Prother — find the right AI tool.", "from Prother. Find the right AI tool."],
  ["from Prother — notes from the directory.", "from Prother. Notes from the directory."],
  ["Hit VERIFY NOW — we fetch your page and look for the tag.", "Hit VERIFY NOW: we fetch your page and look for the tag."],
  ["Hold the top slot of this category — one sponsor, fixed price, clearly labeled.",
   "Hold the top slot of this category: one sponsor, fixed price, clearly labeled."],
  ["Honest pricing — what does it start at? (S4)", "Honest pricing: what does it start at? (S4)"],
  ["Honest, specific, useful — what does this tool actually do well or badly?",
   "Honest, specific, useful: what does this tool actually do well or badly?"],
  ["How Prother works: a curated search & discovery platform for AI tools — 7 categories, six published listing standards, and honest reviews.",
   "How Prother works: a curated search & discovery platform for AI tools, with 7 categories, six published listing standards, and honest reviews."],
  ["How you build with models and agents — workflows, prompts, stack.", "How you build with models and agents: workflows, prompts, stack."],
  ["KV site copy — hero, announcement, footer, SEO defaults. No deploys.", "KV site copy: hero, announcement, footer, SEO defaults. No deploys."],
  ["Live, working AI products of any size — indie or funded.", "Live, working AI products of any size, indie or funded."],
  ["No paid tier — say why it stays free", "No paid tier: say why it stays free"],
  ["No reviews yet — be the first after you've tried it.", "No reviews yet. Be the first after you've tried it."],
  ["No reviews yet — be the first after you&apos;ve tried it.", "No reviews yet. Be the first after you&apos;ve tried it."],
  ["No. Prother is a pure directory — no launch days, no upvoting, no leaderboards.",
   "No. Prother is a pure directory: no launch days, no upvoting, no leaderboards."],
  ["Nothing has been submitted to this category so far — browse all tools in this category from the directory.",
   "Nothing has been submitted to this category so far. Browse all tools in this category from the directory."],
  ["live and usable right now — no vaporware.", "live and usable right now. No vaporware."],
  ["One supporting sentence — optional.", "One supporting sentence (optional)."],
  ["never between them — intent without the ambush.", "never between them: intent without the ambush."],
  ["Pick two tools to compare — or start from a popular matchup below.", "Pick two tools to compare, or start from a popular matchup below."],
  ["Press Verify — we fetch your page and match the token", "Press Verify: we fetch your page and match the token"],
  ["Pricing, features, and reviews in one view — decide between two tools in minutes.",
   "Pricing, features, and reviews in one view. Decide between two tools in minutes."],
  ["Primary taxonomy — names, emoji, slugs, tool counts.", "Primary taxonomy: names, emoji, slugs, tool counts."],
  ["Prother Forums — compare notes with the AI builder crowd", "Prother Forums: compare notes with the AI builder crowd"],
  ["Prother house ad — this advertising slot is open.", "Prother house ad: this advertising slot is open."],
  ["save your stack — no launch games, no pay-to-win ranking.", "save your stack. No launch games, no pay-to-win ranking."],
  ["Ratings from published reviews — ease, power, value — not popularity contests.",
   "Ratings from published reviews (ease, power, value), not popularity contests."],
  ["go live immediately — no calendar, no waiting room.", "go live immediately: no calendar, no waiting room."],
  ["status tracker — same email, no account needed.", "status tracker: same email, no account needed."],
  ["Searching, comparing, and saving are free. Listings are free. Sponsored slots are labeled — never blended in.",
   "Searching, comparing, and saving are free. Listings are free. Sponsored slots are labeled, never blended in."],
  ["Say hi — what you worked on before, what you are building now.", "Say hi: what you worked on before, what you are building now."],
  ["AI products and tools — a curated directory with honest pricing, reviews, and side-by-side comparisons.",
   "AI products and tools: a curated directory with honest pricing, reviews, and side-by-side comparisons."],
  ["and developer platforms — with honest pricing and real reviews.", "and developer platforms, with honest pricing and real reviews."],
  ["Sponsor an issue of the Journal — the weekly brief on what shipped and why it matters.",
   "Sponsor an issue of the Journal, the weekly brief on what shipped and why it matters."],
  ["Sponsored campaigns — placements, flights, budgets and CTR.", "Sponsored campaigns: placements, flights, budgets and CTR."],
  ["in the AI tools directory — reviewed against six published standards, searchable from day one.",
   "in the AI tools directory, reviewed against six published standards, searchable from day one."],
  ["in the AI tools directory — reviewed against six published standards.",
   "in the AI tools directory, reviewed against six published standards."],
  ["The curated directory for AI tools — search, compare, and save your stack. Filter by category, pricing, and tags. No gates — browse free.",
   "The curated directory for AI tools: search, compare, and save your stack. Filter by category, pricing, and tags. No gates. Browse free."],
  ["The curated directory for AI tools — search, compare, and save your stack.",
   "The curated directory for AI tools: search, compare, and save your stack."],
  ["The curated directory of AI tools — search, compare, and save your stack.",
   "The curated directory of AI tools: search, compare, and save your stack."],
  ["The tool may serve any market — the listing itself is in English.",
   "The tool may serve any market. The listing itself is in English."],
  ["whether a real free tier exists — the difference between a demo reel and a deliverable.",
   "whether a real free tier exists: the difference between a demo reel and a deliverable."],
  ["Unfill rate — (house + unfilled) / requested", "Unfill rate: (house + unfilled) / requested"],
  ["What does it do, who is it for, and what makes the AI core to the value — not a bolt-on?",
   "What does it do, who is it for, and what makes the AI core to the value, not a bolt-on?"],
  ["Write an excerpt that earns the click — it doubles as the meta description.",
   "Write an excerpt that earns the click. It doubles as the meta description."],
  ["Yes — submitting and being listed are free, forever.", "Yes. Submitting and being listed are free, forever."],

  // JSX fragments (entities / multi-line wraps)
  ["Submitting is free and open — no waitlist, no invite. Approved", "Submitting is free and open: no waitlist, no invite. Approved"],
  ["and tools — every listing reviewed against published standards,", "and tools, every listing reviewed against published standards,"],
  ["audience arrives with intent — they search, compare, and save", "audience arrives with intent: they search, compare, and save"],
  ["attention for a moment — not a popunder they&apos;ll learn to ignore.", "attention for a moment, not a popunder they&apos;ll learn to ignore."],
  ["Notes on finding, comparing, and choosing AI tools — reviews, directories, and ecosystem data",
   "Notes on finding, comparing, and choosing AI tools: reviews, directories, and ecosystem data"],
  ["Nothing here yet — the curator is still picking.", "Nothing here yet. The curator is still picking."],
  ["Your bookmarked tools, threads, and posts — kept on this device", "Your bookmarked tools, threads, and posts, kept on this device"],
  ["Couldn&apos;t load your saved items — check your connection and retry.", "Couldn&apos;t load your saved items. Check your connection and retry."],
  ["Nothing saved yet — tap the bookmark on any tool or thread.", "Nothing saved yet. Tap the bookmark on any tool or thread."],
  ["Collections and follows live in your account — sign in to keep your", "Collections and follows live in your account. Sign in to keep your"],
  ["No collections yet — create your first one above, or hit the", "No collections yet. Create your first one above, or hit the"],
  ["Follow tools, categories, and makers from their pages — new", "Follow tools, categories, and makers from their pages. New"],
  ["One submission per domain — pick another product or contact editors.", "One submission per domain: pick another product or contact editors."],
  ["Review usually takes 1–2 days — approved", "Review usually takes 1–2 days. Approved"],
  ["Done — back to the directory", "Done. Back to the directory"],
  ["enrich your listing — you&apos;ll get a preview.", "enrich your listing: you&apos;ll get a preview."],
  ["By submitting you agree to editor review — rejections cite the", "By submitting you agree to editor review, and rejections cite the"],
  ["Couldn&apos;t load the comparison for this pair — try different tools.", "Couldn&apos;t load the comparison for this pair. Try different tools."],
  ["Replies are tied to an account — the header sign-in uses email magic links, no password.",
   "Replies are tied to an account: the header sign-in uses email magic links, no password."],
  ["Your session expired — use the SIGN IN button in the header (email magic link).",
   "Your session expired. Use the SIGN IN button in the header (email magic link)."],
  ["AI tools — workflows, pricing, and what actually happened.", "AI tools: workflows, pricing, and what actually happened."],
  ["Threads are tied to an account — the header sign-in uses email", "Threads are tied to an account: the header sign-in uses email"],
  ["Ranked by real engagement — comments, reviews, and collection", "Ranked by real engagement (comments, reviews, and collection"],
  ["saves — recalculated continuously, not by editorial whim.", "saves), recalculated continuously, not by editorial whim."],
  ["Listings, journal, taxonomy and site copy — one key,", "Listings, journal, taxonomy and site copy: one key,"],
  ["Couldn&apos;t load dashboard data — check the admin key or", "Couldn&apos;t load dashboard data. Check the admin key or"],
  ["Editors check every listing against the six standards — typically", "Editors check every listing against the six standards, typically"],
  ["Check the spelling or explore a category — everything AI, one directory.",
   "Check the spelling or explore a category. Everything AI, one directory."],
  ["Live kill switches — no deploy.", "Live kill switches: no deploy."],
  ["Couldn&apos;t load the directory — please refresh the page.", "Couldn&apos;t load the directory. Please refresh the page."],
  ["Couldn&apos;t load the discussion — it will appear next time you open", "Couldn&apos;t load the discussion. It will appear next time you open"],
  ["No collections yet — create your first one below.", "No collections yet. Create your first one below."],
  ["No results — try &quot;chatbot&quot; or &quot;video&quot;.", "No results. Try &quot;chatbot&quot; or &quot;video&quot;."],
  ["Check your inbox — the link expires in 15 min.", "Check your inbox. The link expires in 15 min."],
  ["Couldn&apos;t load data — check the admin key or network, then retry.", "Couldn&apos;t load data. Check the admin key or network, then retry."],
  ["Search the full directory — {total} tools, honestly listed.", "Search the full directory: {total} tools, honestly listed."],
];

const WORD_RULES = [
  [/ — with /g, ", with "],
  [/ — from /g, ", from "],
  [/ — especially /g, ", especially "],
  [/ — including /g, ", including "],
  [/ — not /g, ", not "],
  [/ — and /g, ", and "],
  [/ — or /g, ", or "],
  [/ — but /g, ", but "],
  [/ — so /g, ", so "],
  [/ — which /g, ", which "],
  [/ — who /g, ", who "],
  [/ — where /g, ", where "],
  [/ — when /g, ", when "],
  [/ — built /g, ", built "],
  [/ — per /g, ", per "],
  [/ — no /g, ": no "],
];

function rulesForProse(s) {
  // paired dashes → parentheses (asides up to 90 chars between)
  for (let i = 0; i < 4; i++) {
    const next = s.replace(/ — ([^—\n]{2,90}?) — /g, " ($1) ");
    if (next === s) break;
    s = next;
  }
  // ALLCAPS label — LABEL → middot
  s = s.replace(/([A-Z0-9✓✕&'’.\-×]{2,}[A-Z0-9]) — ([A-Z0-9&'’.\-×]{2,})/g, "$1 · $2");
  // connective word rules
  for (const [re, to] of WORD_RULES) s = s.replace(re, to);
  // default single dash: elaboration → colon (lowercase next word), or period if next is capitalized
  s = s.replace(/ — ([a-z])/g, ": $1");
  s = s.replace(/ — ([A-Z])/g, ". $1");
  return s;
}

function transformSeeds(src) {
  // apply prose rules inside double-quoted / backtick strings only
  return src.replace(/"[^"\n]*—[^"\n]*"|`[^`]*—[^`]*`/g, (m) => {
    let inner = m.slice(1, -1);
    inner = rulesForProse(inner);
    return m[0] + inner + m[m.length - 1];
  });
}

function transformSrcLineAware(src) {
  return src
    .split("\n")
    .map((line) => {
      if (!line.includes("—")) return line;
      const t = line.trimStart();
      const isComment = t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.includes("{/*") || t.includes("*/");
      if (isComment) {
        // still allow exact table hits inside comments (doc examples)
        let l = line;
        for (const [a, b] of TABLE) if (l.includes(a)) l = l.split(a).join(b);
        return l;
      }
      // apply table on the whole line first
      let out = line;
      for (const [a, b] of TABLE) if (out.includes(a)) out = out.split(a).join(b);
      if (out.includes("—")) {
        // string spans only
        out = out.replace(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g, (m) => {
          if (!m.includes("—")) return m;
          let inner = m.slice(1, -1);
          // ALLCAPS label → middot
          inner = inner.replace(/([A-Z0-9✓✕&'’.\-×]{2,}[A-Z0-9]) — ([A-Z0-9&'’.\-×]{2,})/g, "$1 · $2");
          for (const [re, to] of WORD_RULES) inner = inner.replace(re, to);
          inner = inner.replace(/ — ([a-z])/g, ": $1").replace(/ — ([A-Z])/g, ". $1");
          return m[0] + inner + m[m.length - 1];
        });
      }
      return out;
    })
    .join("\n");
}

let touched = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const isSeed = f.startsWith("/home/z/my-project/prisma");
  const out = isSeed ? transformSeeds(src) : transformSrcLineAware(src);
  if (out !== src) {
    writeFileSync(f, out);
    touched++;
  }
}
console.log("files touched:", touched);
