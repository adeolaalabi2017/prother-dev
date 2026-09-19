# Deploying Prother to Cloudflare (Workers, via OpenNext)

## Why this replaces the old Pages path

Next.js is a Node.js framework; classic **Cloudflare Pages** executes on the
Workers V8 runtime, and the legacy adapter **`@cloudflare/next-on-pages` is
deprecated**. Cloudflare's supported path today is **Workers with static
assets** driven by **`@opennextjs/cloudflare`** (Pages itself is in
maintenance mode). `vinext` is an interesting Vite-native alternative but is
still experimental — for an existing Next.js 16 app, OpenNext is the
production-ready choice, so this repo targets it.

**Compatibility note:** `@opennextjs/cloudflare@1.20.x` requires
`next >= 16.3.3` for the Next 16 line — the repo was upgraded from
`16.1.1 → 16.3.5` for exactly this reason (this mismatch is what broke the
previous Pages deploy).

## What was added

| File | Purpose |
| --- | --- |
| `wrangler.jsonc` | Worker entry (`.open-next/worker.js`) + static assets binding (`ASSETS`), `nodejs_compat` flag, observability |
| `open-next.config.ts` | OpenNext config (default in-isolate revalidation cache) |
| `package.json` scripts | `cf:build` / `cf:preview` / `cf:deploy` / `cf:typegen` |
| `next.config.ts` | Drops `output: "standalone"` for Workers builds (`NEXT_OUTPUT=cloudflare`); optional dev-bindings proxy (`NEXT_CF_DEV=1`) |

## Deploy

```bash
bun install                 # picks up @opennextjs/cloudflare + wrangler 4
bun run cf:preview          # builds .open-next/ and serves it locally on workerd
wrangler login              # one-time browser auth (or set CLOUDFLARE_API_TOKEN)
bun run cf:deploy           # build + deploy → https://prother.<account>.workers.dev
```

- Custom domain: Cloudflare dashboard → Workers & Pages → prother →
  Domains & Routes (or `wrangler deploy` again after adding the route).
- Type-safe bindings (D1/KV later): `bun run cf:typegen` generates
  `cloudflare-env.d.ts` (`CloudflareEnv` interface).
- Local dev with real bindings: `NEXT_CF_DEV=1 bun run dev`.
- Windows shells don't support the `VAR=value cmd` prefix used by the `cf:*`
  scripts — run under WSL/Git Bash, or set `NEXT_OUTPUT=cloudflare` manually.

## ⚠️ Database on Workers (known blocker, next phase)

The app currently uses **Prisma + a local SQLite file** (`db/custom.db`).
Workerd has **no filesystem**, so Prisma's SQLite engine cannot run on
Workers — DB-backed API routes (`/api/feed`, `/api/waitlist`, `/api/vote`,
…) will 500 until the data layer is migrated. Marketing page + static shell
deploy fine today. Options, in order of fit:

1. **Cloudflare D1** (SQLite at the edge) — switch Prisma to the
   `@prisma/adapter-d1` driver adapter, or use Drizzle's D1 dialect. The
   `d1_databases` binding slot is already reserved in `wrangler.jsonc`.
2. **Turso (libSQL)** — `@prisma/adapter-libsql`; keeps SQLite semantics,
   works from anywhere including Workers.
3. **Split deployment** — keep API routes on a Node host (Fly/Railway), point
   the frontend at it via `NEXT_PUBLIC_API_BASE`.

## Caching (optional, after DB phase)

ISR/revalidation cache is per-isolate by default. For durable caching add a
KV or R2 binding and wire `kvIncrementalCache` / `r2IncrementalCache` in
`open-next.config.ts` (see OpenNext docs → Incremental cache).
