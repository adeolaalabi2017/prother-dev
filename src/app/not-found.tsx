import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

/**
 * Global 404. Rendered when a route calls notFound().
 *
 * Next streams the response shell before the page component resolves, so on
 * this app (every provider in the root layout is `ssr: false`, which forces a
 * client-side-render bailout) the 200 status is already on the wire by the
 * time notFound() throws. This file does not change that status — see
 * docs/soft-404.md — but it does give crawlers and humans a real, linkable
 * "not found" page instead of an empty shell.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-mono text-xs font-semibold tracking-[0.25em] text-ember uppercase">
        404 · Not found
      </p>
      <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
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
