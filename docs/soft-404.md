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

## Remaining exposure

Until the status is fixed, crawlers can index unbounded junk URLs under
`/tools/`. Mitigations that would actually close it, in rough order of effort:

- **Revalidate the streaming assumption** by temporarily removing the
  `ssr: false` providers from the root layout and re-testing the replica
  against the real page. If the 404 returns, the bailout is the cause and the
  fix is to render the shell server-side (the providers can be loaded lazily on
  the client without `ssr: false`, or behind a Suspense boundary).
- **Serve the tool route from a proxy/middleware check** that validates the
  slug against a cached slug list and returns 410/404 before the render starts.
  This sidesteps streaming entirely and is the most reliable option, at the
  cost of a slug list to keep in sync.
- **`generateStaticParams` + `dynamicParams: false`** on `/tools/[slug]`, which
  makes Next 404 any slug not in the build output. This is the idiomatic fix but
  conflicts with `export const dynamic = "force-dynamic"` on the route and would
  require a rebuild per new tool.

## Related change

`getConvexBundle` is now wrapped in React's `cache()`. `generateMetadata()` and
`ToolPage()` both call it and Next runs them concurrently, so each page view was
issuing two identical Convex round trips. `cache()` scopes the memo to a single
server request, so the second caller awaits the first. This halves the Convex
traffic on tool pages. It did not change the 404 status — verified on the
standalone production build.

## Reproducing

The local dev environment cannot distinguish a real slug from a bogus one: the
`NEXT_PUBLIC_CONVEX_URL` deployment is missing the `tools` table, so
`tools:pageData` returns `{ error: "not_found" }` for **every** slug including
`cline`. Test against production, or point `.env.local` at a deployment with
seeded tools.
