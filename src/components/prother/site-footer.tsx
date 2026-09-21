"use client";

import Link from "next/link";
import { Hexagon } from "lucide-react";
import { useExplorer } from "./explorer-store";

type FooterLink = {
  label: string;
  href: string;
  /** Opens the maker status tracker overlay instead of navigating. */
  tracker?: boolean;
  /** External / non-route href (mailto:, /api/*) — rendered as <a>. */
  external?: boolean;
};

const COLS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "The feed", href: "/#feed" },
      { label: "Browse tools", href: "/tools" },
      { label: "Categories", href: "/tools" },
      { label: "Forums", href: "/forums" },
      { label: "Submit your tool", href: "/submit" },
      { label: "Check submission status", href: "#", tracker: true },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "The Journal", href: "/journal" },
      { label: "Launch playbooks", href: "/journal" },
      { label: "FAQ", href: "/about" },
      { label: "For makers", href: "/submit" },
      { label: "Listing standards", href: "/about" },
      { label: "RSS — launches", href: "/api/rss", external: true },
      { label: "RSS — journal", href: "/api/rss?kind=journal", external: true },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "mailto:makers@prother.dev", external: true },
      { label: "Advertise", href: "/advertise" },
      { label: "Press", href: "/about" },
      { label: "Trademark", href: "/about" },
    ],
  },
];

function FooterAnchor({ link }: { link: FooterLink }) {
  const className =
    "text-sm text-white/50 transition-colors hover:text-ember";
  if (link.external) {
    return (
      <a href={link.href} className={className}>
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

export function SiteFooter() {
  const setEditorOpen = useExplorer((s) => s.setEditorOpen);
  const setTrackOpen = useExplorer((s) => s.setTrackOpen);
  return (
    <footer className="mt-auto border-t border-white/10 bg-ink">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <Hexagon className="size-6 fill-ember text-ember" aria-hidden />
              <span className="text-lg font-black tracking-tight text-white">Prother</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-white/50">
              Where AI products get discovered. The daily feed for AI tools, makers, and the
              people who evaluate them.
            </p>
            <p className="mt-4 font-mono text-xs text-white/30">@PROTHER_DEV · PROTHER.DEV</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <kbd className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] tracking-wider text-white/45 transition-colors hover:border-ember/40 hover:text-ember">
                <span className="text-white/80">⌘K</span> SEARCH
              </kbd>
              <kbd className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] tracking-wider text-white/45 transition-colors hover:border-ember/40 hover:text-ember">
                <span className="text-white/80">⌘⇧E</span> EDITOR
              </kbd>
              <kbd className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] tracking-wider text-white/45 transition-colors hover:border-ember/40 hover:text-ember">
                <span className="text-white/80">⌘⇧A</span> ADMIN
              </kbd>
            </div>
          </div>

          {COLS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mb-3 text-sm font-semibold text-white">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.tracker ? (
                      <button
                        type="button"
                        onClick={() => setTrackOpen(true)}
                        className="text-sm text-white/50 transition-colors hover:text-ember"
                      >
                        {l.label}
                      </button>
                    ) : (
                      <FooterAnchor link={l} />
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 px-4 py-6 sm:px-6 md:flex-row md:items-center">
          <p className="font-mono text-xs text-white/40">
           © 2026 Prother — Curation is never sold.
          </p>
          <div className="flex items-center gap-2 font-mono text-xs text-white/40">
            <span>STANDARDS · PRIVACY · STATUS</span>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="rounded px-1 py-0.5 transition-colors hover:text-ember"
              title="Editor review console (⌘⇧E)"
            >
              EDITOR ACCESS
            </button>
            <span aria-hidden>·</span>
            <Link
              href="/admin"
              className="rounded px-1 py-0.5 transition-colors hover:text-ember"
              title="Admin console (⌘⇧A)"
            >
              ADMIN
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
