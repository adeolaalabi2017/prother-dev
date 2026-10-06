# Monetization pause (2026-09-25)

## Decision

Both monetization engines sell eyeballs — ad networks need traffic, and
paid listings are worthless to makers without traffic. Until Prother has
meaningful traffic, monetization is paused, not removed.

Single-curator model stands (see launch notes): listings stay as curated,
no unclaimed states or badges until traffic justifies maker outreach.

## What changed (all reversible)

1. **Ad serving off** — `ads.master = "0"` in site settings (local Convex
   + production Convex). Every `AdSlot` unmounts site-wide;
   `/api/ads/serve` returns `fallback: "none"`. Zero code changes; flip
   back to `"1"` to resume.
2. **`/advertise` hidden** — page calls `notFound()`; footer link removed;
   sitemap entry removed. The pitch page stays in the tree so it returns
   with one revert.
3. **"Never sold" promise removed** — the line lived in three places:
   - footer note (`footer.note` setting → now `"Curated, human-reviewed."`;
     code fallback updated to match),
   - homepage "Spam tools, ever" card (sentence dropped),
   - submit FAQ "Is submitting free?" (kept "free, forever", dropped the
     rankings sentence).

## What was deliberately left alone

- The entire ads module, campaign CRUD, measurement, and `/advertise` page
  source — dormant, no ad JS ships while placements are off.
- House creatives (`HouseCard`) still link `/advertise`: unreachable while
  serving is off; on resume, un-hide the page first.
- The `$0 Forever` homepage card still mentions labeled sponsored slots —
  dormant future behavior, revisit on resume.

## Resume checklist (when traffic justifies it)

- [ ] Set `ads.master` back to `"1"` (both environments)
- [ ] Remove `notFound()` from `/advertise/page.tsx`, restore footer link
      + sitemap entry
- [ ] Decide the rankings promise: restore, reword, or keep dropped
- [ ] Re-verify an ad serve + click round-trip before announcing
