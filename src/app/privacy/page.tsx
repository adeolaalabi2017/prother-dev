import type { Metadata } from "next";
import Link from "next/link";
import { createServerConvexClient } from "@/lib/convex";
import { shadowSiteSetting } from "@/lib/data";
import { staticPageCopy } from "@/lib/static-pages";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  title: "Privacy Policy | Prother",
  description:
    "How Prother collects, uses, and protects your data: accounts, cookieless analytics, and your rights.",
  openGraph: {
    title: "Privacy Policy | Prother",
    description:
      "How Prother collects, uses, and protects your data: accounts, cookieless analytics, and your rights.",
    siteName: "Prother",
    type: "website",
  },
};

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pt-8 text-xl font-bold tracking-tight text-white">
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[15px] leading-relaxed text-white/70">{children}</p>;
}

/** /privacy — plain-language privacy policy (also serves Google OAuth
 *  verification). Full copy is editable from the admin Site settings
 *  (`page.privacy`); the baked version below is the fallback. */
export default async function PrivacyPage() {
  const raw = await shadowSiteSetting(createServerConvexClient(), "page.privacy").catch(() => null);
  const copy = staticPageCopy("page.privacy", raw ?? undefined);
  return (
    <div className="bg-ink pb-16 md:pb-0">
      <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6 md:max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-ember-tint">
          {copy.kicker}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-4 font-mono text-xs uppercase tracking-wider text-white/55">
          {copy.updated ?? ""}
        </p>

        <P>{copy.intro}</P>

        {copy.sections.map((s) => (
          <div key={s.h}>
            <H>{s.h}</H>
            <P>{s.p}</P>
          </div>
        ))}

        <p className="mt-10 border-t border-white/10 pt-6 font-mono text-xs uppercase tracking-wider text-white/55">
          <Link href="/terms" className="transition-colors hover:text-ember">
            Terms of Service
          </Link>
          <span aria-hidden className="mx-3">·</span>
          <Link href="/" className="transition-colors hover:text-ember">
            Home
          </Link>
        </p>
      </article>
    </div>
  );
}
