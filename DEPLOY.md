# Deploying Prother to Cloudflare (Workers, via OpenNext)

Next.js on Workers with static assets, driven by `@opennextjs/cloudflare`
(Pages + `@cloudflare/next-on-pages` are deprecated/maintenance-mode).
`@opennextjs/cloudflare@1.20.x` requires `next >= 16.3.3` — the repo pins
Next 16.3.5 for exactly this reason.

## Current architecture (post-Convex cutover)

| Concern | Where it lives | Workers-safe? |
| --- | --- | --- |
| Reads + writes (tools, posts, forum, community, ads, analytics, SEO) | Convex (`NEXT_PUBLIC_CONVEX_URL`) | Yes (fetch-based client) |
| Media bytes | Convex file storage (`_storage`), served as 307s from `/api/media/[id]` | Yes |
| Sessions / users | Convex auth store (`AUTH_STORE=convex`) | Yes |
| Magic-link SMTP | `sendVerificationRequest` hook in `src/lib/auth.ts` (dev-inbox stand-in) | Needs a real transport in prod |
| `db/auth.db` fallbacks | Dynamic `import()` only — never evaluated on Workers | Yes (dead code paths there) |

There is no Prisma, SQLite, or filesystem access left on any request path:
settings PUT keeps a `custom.db` backup row and `isUserBanned`/avatar-clear
keep auth.db fallbacks, but all three import the native binding dynamically
and only execute on Node. The `d1_databases` reservation once noted here is
obsolete — no D1/Turso/split deployment is needed anymore.

## Required environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment (bake at build time for client components too) |
| `AUTH_STORE=convex` | Serve NextAuth sessions from Convex (default `sqlite` is Node-only) |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for OG/canonical URLs (defaults to `https://prother.dev`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional — enables Google OAuth alongside magic links |
| `EMAIL_FROM` | Sender for magic links once SMTP is wired |
| `AUTH_DEV_LINKS=false` | Set in production (disables the dev-inbox endpoint) |

## Deploy

```bash
bun install
bun run cf:preview          # builds .open-next/ and serves it locally on workerd
wrangler login              # one-time browser auth (or set CLOUDFLARE_API_TOKEN)
bun run cf:deploy           # build + deploy → https://prother.<account>.workers.dev
```

- Custom domain: Cloudflare dashboard → Workers & Pages → prother →
  Domains & Routes (or `wrangler deploy` again after adding the route).
- Type-safe bindings (KV/R2 later): `bun run cf:typegen` generates
  `cloudflare-env.d.ts` (`CloudflareEnv` interface).
- Local dev with real bindings: `NEXT_CF_DEV=1 bun run dev`.
- Local dev against Convex: `npx convex dev` + `.env.local` with
  `NEXT_PUBLIC_CONVEX_URL` (and `AUTH_STORE=convex` for the Convex session store).
- Local Worker preview caveat: workerd cannot reach host-loopback URLs, so
  `.dev.vars` must use a LAN-reachable Convex URL (e.g.
  `http://192.168.x.x:3210`, not `http://127.0.0.1:3210`). The same applies
  to any private-IP backend behind `global_fetch_strictly_public`.
- Windows shells don't support the `VAR=value cmd` prefix used by the `cf:*`
  scripts — run under WSL/Git Bash, or set `NEXT_OUTPUT=cloudflare` manually.

## Pre-launch checklist

- [ ] Production Convex deployment created; `NEXT_PUBLIC_CONVEX_URL` points at it
- [ ] Data imported (`node scripts/export-to-convex.ts` + `backfill-auth-to-convex.ts`)
- [ ] `AUTH_STORE=convex` set in the Worker environment
- [ ] Real SMTP wired into `sendVerificationRequest` (or magic-link login stays dev-only)
- [ ] `AUTH_DEV_LINKS=false` in production
- [ ] Branding logo/favicon re-uploaded via the admin console (old rows reference pre-migration bytes)
- [ ] `bun run cf:preview` smoke-tested: homepage, `/tools`, sign-in, admin console

## Caching (optional)

ISR/revalidation cache is per-isolate by default. For durable caching add a
KV or R2 binding and wire `kvIncrementalCache` / `r2IncrementalCache` in
`open-next.config.ts` (see OpenNext docs → Incremental cache).
