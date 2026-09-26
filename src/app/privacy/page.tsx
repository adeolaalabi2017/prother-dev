import type { Metadata } from "next";
import Link from "next/link";

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

/** /privacy — plain-language privacy policy (also serves Google OAuth verification). */
export default function PrivacyPage() {
  return (
    <div className="bg-ink pb-16 md:pb-0">
      <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6 md:max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-ember-tint">
          Legal
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 font-mono text-xs uppercase tracking-wider text-white/55">
          Last updated: September 25, 2026
        </p>

        <P>
          Prother is a directory for discovering AI tools. This policy explains
          what data we collect, why, and the choices you have. Questions:
          <a href="mailto:makers@prother.dev" className="text-ember hover:underline"> makers@prother.dev</a>.
        </P>

        <H>Accounts</H>
        <P>
          Signing in is optional — browsing, searching, and comparing work
          without an account. If you create one (email magic link or Google
          OAuth), we store your email address, plus the name, handle, bio, and
          avatar you choose. Google sign-in additionally receives the basic
          profile Google shares (name, email, profile picture). Sessions last
          30 days; signing out ends them immediately, and banning an account
          revokes all of its live sessions.
        </P>

        <H>Content you create</H>
        <P>
          Reviews, comments, forum posts, collections, bookmarks, follows,
          tool submissions, ownership claims, and reports are stored so the
          site can display them, attribute them to you, and moderate them.
          Public content (reviews, posts, public collections) is visible to
          everyone, including search engines.
        </P>

        <H>Analytics — cookieless by design</H>
        <P>
          We count page views in aggregate (page × day) to understand traffic
          and report it to advertisers. We store no cookies, IP addresses, or
          user-agent strings for analytics — there is nothing personal to
          leak, so no consent banner is needed.
        </P>

        <H>Advertising</H>
        <P>
          Sponsored placements are sold directly and always labeled. We use no
          third-party advertising trackers, and we never sell personal data.
        </P>

        <H>Data storage and sharing</H>
        <P>
          Data is stored with our infrastructure providers (application
          database, file storage, and transactional email) and processed only
          to operate Prother. We disclose data only when required by law or
          to prevent abuse.
        </P>

        <H>Your rights</H>
        <P>
          You can edit your profile at any time. For a copy of your data or
          full account deletion (profile, content attributions, and sessions),
          email <a href="mailto:makers@prother.dev" className="text-ember hover:underline">makers@prother.dev</a>{" "}
          from your account address and we will action it promptly.
        </P>

        <H>Changes</H>
        <P>
          Material changes to this policy will be noted here with a new
          revision date. Continued use of Prother after changes take effect
          constitutes acceptance.
        </P>

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
