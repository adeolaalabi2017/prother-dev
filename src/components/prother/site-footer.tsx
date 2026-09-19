import { Hexagon } from "lucide-react";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "The feed", href: "#feed" },
      { label: "Categories", href: "#categories" },
      { label: "Standards", href: "#standards" },
      { label: "Submit your tool", href: "#submit" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "The Daily Launch", href: "#feed" },
      { label: "FAQ", href: "#faq" },
      { label: "For makers", href: "#submit" },
      { label: "Listing standards", href: "#standards" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Press", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Trademark", href: "#" },
    ],
  },
];

export function SiteFooter() {
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
              Where AI products launch. The daily feed for AI tools, makers, and the people who
              evaluate them.
            </p>
            <p className="mt-4 font-mono text-xs text-white/30">@PROTHER_DEV · PROTHER.DEV</p>
          </div>

          {COLS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mb-3 text-sm font-semibold text-white">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-white/50 transition-colors hover:text-ember"
                    >
                      {l.label}
                    </a>
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
          <p className="font-mono text-xs text-white/40">STANDARDS · PRIVACY · STATUS</p>
        </div>
      </div>
    </footer>
  );
}
