# Frontend Engineering Audit: Prother.dev shipped React layer (no frontend plan on file)

**Perspective**: Frontend Engineer
**Date**: 2026-11-18
**Plan**: none. `docs/superpowers/plans/2026-11-02-security-vulnerability-fixes.md` and `docs/convex-migration-plan.md` are backend plans, so this audit reviews the current client code on `main` (2965056) instead.

## Plan Summary
No plan changes the React/TS layer. This audit covers the global client shell (root layout overlays, Zustand stores, bookmarks, compare, Convex islands) and the main data-fetching components (tool overlay, directory, hero search, command palette).

## Files Reviewed
| File | Frontend Role | Risk |
|------|--------------|------|
| `src/app/layout.tsx` | Root shell, mounts `GlobalOverlays` on every route | High |
| `src/components/prother/global-overlays.tsx` | 10 `next/dynamic` overlays rendered unconditionally | High |
| `src/components/prother/explorer-store.ts` | Zustand UI store and URL/history sync | Medium |
| `src/components/prother/compare-store.ts` | Granular compare selectors | Low |
| `src/components/prother/use-bookmarks.ts` | Zustand bookmark store, optimistic toggle | High |
| `src/components/prother/deep-link-host.tsx` | popstate to store replay | Medium |
| `src/components/prother/tool-full-page.tsx` | Tool overlay (2100 lines), fetch on slug | High |
| `src/components/prother/tool-card.tsx` | Directory/grid card | Medium |
| `src/components/prother/compare-tray.tsx` | Floating tray, per-slug fetch | Low |
| `src/components/prother/tools-directory.tsx` | Filters, debounced fetch, load more | High |
| `src/components/prother/hero-search.tsx` | Hero search, Convex live queries | Low |
| `src/components/prother/tool-explorer.tsx` | Command palette, Convex live queries | Low |
| `src/components/prother/convex-provider*.tsx` | Convex client per island | Medium |
| `tsconfig.json` | Compiler strictness | Medium |

## Verdict: APPROVE WITH CHANGES

`tsc --noEmit` passes, selectors are mostly granular, and effects clean up correctly. Four real defects remain: three async races and one global fetch cost that hits every page view.

## Critical Issues (Must Fix)
| # | Issue | File(s) | Why It Breaks | Code Fix |
|---|-------|---------|---------------|----------|
| 1 | Stale-response race in tool overlay `load()` | `tool-full-page.tsx:1144-1172` | `load` has no abort or alive guard. Open tool A, then open B (related link, palette, Back) before A resolves: A's `setDetail` lands last and renders A's data under B's slug, URL and bookmark state. `setLoading(false)` from A also hides B's skeleton early. | Use an `AbortController` in the effect: `useEffect(() => { const ctrl = new AbortController(); setDetail(null); setShotIndex(null); void load(ctrl.signal); return () => ctrl.abort(); }, [load]);` Pass the signal into `fetch` and skip every `set*` call when `signal.aborted`. |
| 2 | "Load more" appends rows from the old filter | `tools-directory.tsx:197-223` | `loadMore` captures `query/category/...` at click time. If the visitor changes a filter while page 2 is in flight, the filter effect sets new rows first, then `setRows(prev => [...prev, ...d.rows])` appends rows for the old filter. The result is a mixed list and a wrong `total`. | Keep a request generation ref: `const genRef = useRef(0);` and increment it in the filter effect. In `loadMore`, capture `const gen = genRef.current` and return early before `setRows` when `gen !== genRef.current`. Also abort the in-flight load-more fetch when filters change. |
| 3 | Bookmark `ensure()` race across owner change | `use-bookmarks.ts:105-123` | `inflight` is a single slot. On sign-in (anon to `"session"`), request A (anon) is replaced by B (session). If A resolves after B, A sets `items` and `owner` to the anon list, and its `finally` clears B's inflight marker. The signed-in user then sees the anon bookmarks until reload. | Tag each request and commit only the latest: `const myHint = hint; ... const items = await fetchBookmarkList(hint); if (inflightFor !== myHint) return; set({...})`. Clear `inflight` only when `inflightFor === myHint`. Or use a monotonically increasing request id. |
| 4 | Every page view fetches `/api/bookmarks` | `global-overlays.tsx`, `tool-full-page.tsx:1141`, `use-bookmarks.ts:197-202` | `ToolFullPage` is always mounted and calls `useBookmark("tool", null)` before its `if (!slug) return null` guard. The hook's effect calls `ensure()` whatever `targetId` is, so every route triggers one uncached bookmarks GET as soon as the session resolves, even with no overlay open. | Gate the hook: in `useBookmark`, return early from the effect when `!targetId`. Better: split `ToolFullPage` into a thin gate (`const slug = useExplorer(s => s.slug); return slug ? <ToolFullPageBody slug={slug} /> : null;`) so no body hooks run while closed. Apply the same split to the other always-mounted overlays (see R1). |

## Recommendations
| # | Issue | File(s) | Why | Fix |
|---|-------|---------|-----|-----|
| R1 | Overlay chunks are lazy-split but load eagerly | `global-overlays.tsx` | `next/dynamic` fetches its chunk when the component first renders. All 10 overlays render on every route, so the tool page (2100 lines), editor console (1052), submit wizard (1049) and the others all download and evaluate on first load. The split only takes them out of SSR. | Render each overlay only when its store flag is set: `const submitOpen = useExplorer(s => s.submitOpen); {submitOpen && <SubmitWizard />}`. Do this for slug, postSlug, categoryView, compareOpen, collectionSlug, mineView, savedView, editorOpen and trackOpen. Keep exit animations by holding the flag until `onAnimationComplete` where needed. |
| R2 | Every card re-renders on any compare change | `tool-card.tsx:154`, `tool-full-page.tsx:1126` | `useExplorer(s => s.compare)` subscribes each card to the whole array. Adding one tool re-renders the whole grid (directory, category, homepage rows). | Use a boolean selector: `const inCompare = useExplorer(s => s.compare.includes(slug));`. In `ToolFullPage` also select `s.compare.length >= 4` as a separate primitive. |
| R3 | Every `useBookmark` consumer re-renders on any toggle | `use-bookmarks.ts:195-210` | Each consumer subscribes to the full `items` array and derives membership in `useMemo`. One toggle re-renders every bookmark button on the page. | Derive inside the selector: `const bookmarked = useBookmarkStore(s => !!targetId && (s.items ?? []).some(i => i.targetType === targetType && i.targetId === targetId));`. Select `ready` as a primitive too. |
| R4 | Two Convex clients and two websockets on the homepage | `convex-provider-client.tsx`, `hero-search-with-provider.tsx`, `tool-explorer-with-provider.tsx` | Each island constructs its own `ConvexReactClient` with `useMemo`. The hero subscribes on mount, and opening the palette creates a second client with its own socket and duplicate subscriptions (trending is queried by both). | Make the client a lazily created module singleton: `let client: ConvexReactClient | null = null; function getClient() { return (client ??= new ConvexReactClient(url)); }`. Both providers share one socket and the query cache dedupes. |
| R5 | Overlays stay open after client-side route changes | `deep-link-host.tsx` | The host re-syncs only on mount and `popstate`. A `<Link>` or `router.push` away from `/` does not fire `popstate`, so the store keeps `slug/categoryView/...` set. `tool-full-page.tsx` works around this per link (`onRealLinkClick`), but other overlays and any new link must remember to do the same. `mineView` and `savedView` are also never cleared on non-root paths. | Subscribe to `usePathname()` in `DeepLinkHost` and run `sync()` in an effect keyed on pathname. Then remove the per-link `closeTool({ sync: false })` workarounds. Decide explicitly whether `saved` and `mine` should survive route changes, and document that. |
| R6 | `noImplicitAny: false` under `strict: true` | `tsconfig.json:13` | This silently turns off the most valuable strict check. Untyped callback params and library returns pass as `any`. `tsc` passing gives less assurance than it looks like. | Remove the override, run `bun run typecheck`, and fix the fallout file by file. |
| R7 | API responses are cast, never validated | 31 files under `src/components` (`(await res.json()) as T`) | Zod is used only server-side. A changed or partial response (for example during the D1/Convex fallback) becomes a runtime `undefined` deep in render (`detail.standards.filter`, `detail.category.slug`). | Export the response schemas from the route modules (`src/app/api/tools/[slug]`, `/api/tools`, `/api/bookmarks`), and `safeParse` in the client fetchers. Derive the client types with `z.infer` instead of hand-written `ToolFullDetail` and `DirectoryRow`. |
| R8 | Unchecked URL cast to union | `tools-directory.tsx:122` | `(initialSort as Sort)` trusts `?sort=` from the URL. An unknown value flows into the API query and the sort UI with no matching option. | `const SORTS = ["featured", ...] as const; const sort0 = SORTS.includes(initialSort as Sort) ? (initialSort as Sort) : "featured";` |
| R9 | Optimistic `removeBookmark` revert clobbers concurrent edits | `use-bookmarks.ts:318-340` | On failure, `replaceAll(snapshot)` restores the whole list. Any toggle made while the request was in flight is lost. | Revert only the one item: keep `prev = snapshot.find(...)` and call `upsert(prev)` on failure. |

## Nice-to-Haves
| # | Suggestion | Rationale |
|---|------------|-----------|
| N1 | Fetch only unknown names in `CompareTray` | `compare-tray.tsx:30-58` refetches every slug on each add or remove, and on each `syncFromUrl` (new array identity). Filter `slugs.filter(s => !(s in names))`. |
| N2 | Clear the copy-link timeout on unmount | `tool-full-page.tsx:1215` uses `window.setTimeout` with no cleanup. `setCopied` after close is harmless in React 19 but is a leak pattern. Store the id in a ref and clear it in an effect cleanup. |
| N3 | Fix stale selector docs | `compare-store.ts` says "The 0-2 selected slugs", but the max is 4. `useCompareTrayVisible` claims "hidden whenever any full page is stacked", but it ignores `categoryView`, `collectionSlug` and `savedView`. Align code or comment. |
| N4 | Split `admin-console.tsx` (4390 lines) and `tool-full-page.tsx` (2100 lines) | Each is one module graph. Splitting by tab or section gives better chunking and smaller re-render scopes, and makes the races above easier to see in review. |
| N5 | Use stable badge keys | `tool-card.tsx` uses `key={idx}` on badges. The list is static per render, so this is harmless now. `key={b.label}` is free and stays correct if badges become conditional. |

## Render Path Analysis

**Root shell (every route).** `RootLayout` renders `ThemeProvider > AuthProvider > SiteHeader / main / GlobalOverlays`. `GlobalOverlays` renders 13 client components unconditionally. Each subscribes to 1-8 granular `useExplorer` selectors, so a store write re-renders only the overlays whose slice changed. That part is good. The cost is upfront instead: all overlay chunks download, and their pre-guard hooks run. `ToolFullPage` runs `useSession`, `useToast`, 12 `useState`s and `useBookmark` (which fires the bookmarks GET) before returning `null`.

**Session resolution.** `useSession()` flipping `loading` to `authenticated` re-renders every `useSession` consumer: header auth menu, `ToolFullPage`, every `useBookmark` and `useBookmarksList` instance. Each one runs its own `ensure()` effect. The in-flight dedupe collapses these into one request for the same owner, but on an owner change it exposes race C3.

**Compare toggle.** `addCompare` replaces `compare` with a new array. Subscribers that re-render are every `ToolDecisionCard` on screen (whole-array selector, R2), `ToolFullPage`, `CompareTray` (plus a refetch of all names), `CompareFullPage`, and `useCompareTrayVisible` consumers (boolean, so only on change). For a 30-card directory grid that is 30+ card renders per click, where only 1 is needed.

**Bookmark toggle.** The optimistic `upsert` or `remove` replaces `items`. Every mounted `useBookmark` consumer re-renders and re-runs its `.some()` memo (R3). Then the server reply writes `items` again, causing a second full pass.

**Directory filter.** `setCategory`, `setQuery` and the other filter setters re-render `ToolsDirectory`. After a 250 ms debounce, `replaceState` and a fetch run. `setRows` then re-renders the full card list, and `ToolDecisionCard` is not memoized, so all cards re-render even when rows are unchanged. This is acceptable at the current page size. Add `React.memo` only after R2, because otherwise the whole-array compare subscription defeats it anyway.

**Search islands.** Hero and palette debounce input (180 ms), clean up timers and aborts correctly, and derive staleness from `results.q === q` instead of clearing state in effects. These are well built. The only cost is the duplicate Convex client (R4).

## Type Safety Assessment

- `tsc --noEmit` passes clean (verified 2026-11-18). `strict: true` is set, but `noImplicitAny: false` weakens it (R6).
- Store types are explicit and actions are typed. `OpenOpts` and `BookmarkTargetType` are tight unions.
- The client and server type boundary is the main gap. Every fetch result is `as T` with hand-written response types, and Zod lives only in route handlers. Types are therefore duplicated, not derived, and drift silently (R7).
- URL-derived values are cast into unions without checks (`initialSort as Sort`, explorer `syncFromUrl` accepts any string for `mineView` and `savedView`) (R8).
- Only 8 explicit `any` or `as any` uses in `.tsx`, which is low for a codebase this size.

## Verdict Details
- Component Architecture: CONCERNS (always-mounted overlays run hooks while closed; 2000-4000 line components)
- State Management: CONCERNS (bookmark owner race; route changes do not clear overlay state)
- Type Safety: CONCERNS (`noImplicitAny: false`; unvalidated fetch casts)
- Rendering Performance: CONCERNS (whole-array selectors in cards and bookmark consumers)
- Bundle Impact: CONCERNS (dynamic overlays fetched eagerly on every route; two Convex clients)
