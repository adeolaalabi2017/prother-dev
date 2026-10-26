# Soft 404 on /tools/[slug]

## Symptom

Any unrecognised tool slug returns **HTTP 200** with the generic site shell
instead of a 404:

```
$ curl -o /dev/null -w '%{http_code}\n' https://prother.dev/tools/does-not-exist-xyz
200
$ curl -s https://prother.dev/tools/does-not-exist-xyz | grep -c 'NEXT_HTTP_ERROR_FALLBACK;404'
1
```

The response body *does* contain the 404 digest, so `notFound()` is running and
resolving correctly. Only the **status line** is wrong.

## Why

`notFound()` works correctly in isolation on this app. Verified against a set of
minimal test routes, all of which returned a real 404:

| Test route | Result |
|---|---|
| `notFound()` in a sync server component | 404 |
| `await` (700ms / 1.2s) then `notFound()` | 404 |
| `notFound()` in `generateMetadata` only | 404 |
| `notFound()` in metadata **and** page, both async | 404 |
| `notFound()` in a page that imports the real client components | 404 |
| A faithful replica of `tools/[slug]/page.tsx` (same imports, same double Convex fetch, same two `notFound()` sites) | 404 |

The replica 404s; the real page does not. The remaining difference is the
route's own body, which is 863 lines of server-rendered markup.

The most likely mechanism is response streaming: once Next has flushed the
shell, the status line is already committed to 200 and a later `notFound()`
throw can no longer change it. The root layout compounds this — every provider
in `src/app/layout.tsx` is loaded with `dynamic(..., { ssr: false })`
(`ConvexClientProvider`, `ToolExplorerHost`, `HeroSearch`), which forces a
`BAILOUT_TO_CLIENT_SIDE_RENDERING` on **every** page. The homepage's `H1` is
absent from the raw HTML for exactly this reason, so the entire site currently
ships an empty shell that hydrates client-side.

**This was not conclusively isolated.** The `not-found.tsx` route added here
gives crawlers a real, linkable page, but it does not change the status.

## Mitigations in place

1. **`src/app/not-found.tsx`** — a genuine 404 page with an `H1`, real links to
   `/tools` and `/`, and correct styling. A crawler that follows a junk URL now
   gets an empty-ish page with no links out, instead of a shell that looks like
   a valid listing.

2. **Edge cache headers** (`next.config.ts`) — junk URLs are now cached at the
   CDN for 60s fresh / 300s stale, which limits how much origin work a crawler
   can induce by hammering arbitrary slugs.

## Fix on branch: `fix/soft-404-server-rendering`

Next.js 16.3.5's official `not-found` documentation confirms that streamed
not-found responses can carry HTTP 200, while non-streamed not-found responses
return HTTP 404. This matches the observed symptom: the response body contains
the 404 digest, but the status line is already committed.

The branch narrows the client-only Convex provider to the two interactive
islands that need realtime queries (hero search and the command palette), rather
than wrapping the complete root layout. It also removes the global Convex
directory subscription from `ToolLogo`; logo resolution now uses the canonical
local logo registry and the listing's already-fetched `logoUrl`. This keeps
tool cards and the page body renderable on the server while preserving the
realtime provider for the two components that use Convex hooks.

Files changed for the fix:

- `src/app/layout.tsx`
- `src/components/prother/hero.tsx`
- `src/components/prother/tool-explorer-host.tsx`
- `src/components/prother/use-tool-logos.ts`
- `src/components/prother/hero-search-with-provider.tsx` (new)
- `src/components/prother/tool-explorer-with-provider.tsx` (new)
- `src/app/not-found.tsx` (updated explanation)

Regression coverage added:

- `scripts/check-soft-404.ts` checks the real HTTP status for an unknown tool
  slug, checks that the homepage H1 exists in initial HTML, and optionally
  checks a known tool page.
- `src/lib/__tests__/tool-logo-resolution.test.ts` covers the logo fallback
  contract after removing the global Convex subscription.
- `package.json` exposes the HTTP smoke test as `bun run test:soft-404`.

The fix is not considered verified until the smoke test passes against a local
production build and a Cloudflare/OpenNext preview with a seeded data source.
No production deployment is part of this change.

## Remaining exposure

The smoke test checks HTTP status and the initial HTML rather than relying on
the Next.js 404 digest alone. A valid tool slug should be supplied through
`PROTHER_VALID_TOOL_SLUG` to exercise both sides of the route contract. The
local development Convex environment documented below is not seeded reliably,
so use a local production build or Cloudflare preview with the intended data
backend for a meaningful valid-tool check.

## Reproducing

The local dev environment cannot distinguish a real slug from a bogus one: the
`NEXT_PUBLIC_CONVEX_URL` deployment is missing the `tools` table, so
`tools:pageData` returns `{ error: "not_found" }` for **every** slug including
`cline`. Test against production, or point `.env.local` at a deployment with
seeded tools.
