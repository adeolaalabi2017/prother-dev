import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

/**
 * Keep this page useful for both humans and crawlers. Next.js 16 can return
 * HTTP 200 for a streamed not-found response, so the root layout must remain
 * server-renderable and notFound() must run before the response starts. The
 * regression smoke test in scripts/check-soft-404.ts verifies the actual HTTP
 * status, not only the 404 UI.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-mono text-xs font-semibold tracking-[0.25em] text-ember uppercase">
        404 · Not found
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        That tool isn't listed.
      </h1>
      <p className="mt-4 text-base leading-relaxed text-white/65">
        The page you asked for doesn&apos;t exist, or the listing was removed.
        Every tool in the directory is reviewed before it goes live, so an
        unlisted URL will never resolve.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 rounded-lg bg-ember px-4 py-2.5 text-sm font-semibold text-coal transition-colors hover:bg-ember-hot"
        >
          <Search className="size-4" aria-hidden />
          Browse all tools
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-ember/40 hover:text-ember"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back home
        </Link>
      </div>
    </div>
  );
}
