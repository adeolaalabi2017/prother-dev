import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "/terms" },
  title: "Terms of Service | Prother",
  description:
    "The rules for using Prother: accounts, listings, content standards, moderation, and liability.",
  openGraph: {
    title: "Terms of Service | Prother",
    description:
      "The rules for using Prother: accounts, listings, content standards, moderation, and liability.",
    siteName: "Prother",
    type: "website",
  },
};

/** /terms — plain-language terms of service (also serves Google OAuth verification). */
function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-[15px] leading-relaxed text-white/70">{children}</p>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pt-8 text-xl font-bold tracking-tight text-white">
      {children}
    </h2>
  );
}

export default function TermsPage() {
  return (
    <div className="bg-ink pb-16 md:pb-0">
      <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6 md:max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-ember-tint">
          Legal
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-4 font-mono text-xs uppercase tracking-wider text-white/55">
          Last updated: September 25, 2026
        </p>

        <P>
          By using Prother you agree to these terms. If you don&apos;t agree,
          please don&apos;t use the site. Contact:{" "}
          <a href="mailto:makers@prother.dev" className="text-ember hover:underline">makers@prother.dev</a>.
        </P>

        <H>Accounts</H>
        <P>
          You must provide a valid email address and keep your sign-in method
          secure. You are responsible for activity under your account. We may
          suspend accounts that abuse the service.
        </P>

        <H>Listings and maker claims</H>
        <P>
          Tool listings must describe real, publicly usable products.
          Ownership claims must be truthful — claiming a tool you don&apos;t
          control, or submitting misleading pricing, features, or reviews,
          leads to removal and may lead to a ban. Listings are free; editors
          review every submission against our published listing standards
          before it goes live.
        </P>

        <H>Your content</H>
        <P>
          Reviews, comments, forum posts, and collections must be honest,
          lawful, and yours to share — no spam, harassment, hate, private
          data, or infringing material. You grant Prother a worldwide,
          non-exclusive license to display content you post, so the site can
          function (including search indexing and excerpts). You can delete
          your content and account at any time via{" "}
          <a href="mailto:makers@prother.dev" className="text-ember hover:underline">makers@prother.dev</a>.
        </P>

        <H>Moderation</H>
        <P>
          Editors may edit, hide, or remove content and suspend accounts that
          breach these terms, with or without notice. Moderation decisions on
          rejected submissions include the failed standards so makers can fix
          and resubmit.
        </P>

        <H>Service as-is</H>
        <P>
          Prother is provided &ldquo;as is&rdquo; without warranties. Tool
          information (pricing, features, availability) changes quickly — we
          fact-check but can&apos;t guarantee every detail. To the maximum
          extent permitted by law, Prother is not liable for decisions you
          make based on directory content, nor for downtime or data loss.
        </P>

        <H>Changes</H>
        <P>
          We may update these terms; material changes will be noted here with
          a new revision date. Continued use after changes take effect
          constitutes acceptance.
        </P>

        <p className="mt-10 border-t border-white/10 pt-6 font-mono text-xs uppercase tracking-wider text-white/55">
          <Link href="/privacy" className="transition-colors hover:text-ember">
            Privacy Policy
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
