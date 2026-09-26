import type { Metadata } from "next";
import { CheckCircle2, Clock3, RefreshCcw, ShieldCheck } from "lucide-react";
import { SubmitOpenButton } from "@/components/prother/submit-open-button";
import { StatusTrackerOpenButton } from "@/components/prother/status-tracker-open-button";

export const metadata: Metadata = {
  alternates: { canonical: "/submit" },
  title: "Submit your AI tool · Prother",
  description:
    "Submitting is free. Every approved product gets a permanent listing in the AI tools directory, reviewed against six published standards, searchable from day one.",
  keywords: [
    "submit AI tool",
    "get listed AI tool",
    "AI tool directory submission",
    "AI tools directory",
    "Prother submission",
  ],
  openGraph: {
    title: "Submit your AI tool · Prother",
    description:
      "Submitting is free. Every approved product gets a permanent listing in the AI tools directory, reviewed against six published standards.",
    siteName: "Prother",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Submit your AI tool · Prother",
    description:
      "Submitting is free. Every approved product gets a permanent listing in the AI tools directory.",
    images: ["/api/og"],
  },
};

/** The six published listing standards (mirrors the /about Standards section). */
const STANDARDS: { id: string; title: string; body: string }[] = [
  {
    id: "S1",
    title: "Live & accessible",
    body: "The URL resolves and the product is usable right now. No waitlists, coming-soon pages, or closed betas.",
  },
  {
    id: "S2",
    title: "AI-native",
    body: "AI is the core of the product, not a checkbox. Thin wrappers welcome if they deliver real workflow value.",
  },
  {
    id: "S3",
    title: "Complete listing",
    body: "Clear name, honest tagline, informative description, working links, accurate pricing.",
  },
  {
    id: "S4",
    title: "Honest presentation",
    body: "No fake 'free', no inflated claims, no manufactured social proof.",
  },
  {
    id: "S5",
    title: "Safe & legal",
    body: "No malware, phishing, or violations of model providers' usage policies.",
  },
  {
    id: "S6",
    title: "English listing",
    body: "The tool may serve any market. The listing itself is in English.",
  },
];

const TIMELINE = [
  {
    n: "01",
    title: "You submit",
    body: "One form: URL, name, tagline, category, pricing. Your tool must be live and usable right now. No vaporware.",
    minutes: "~3 minutes",
  },
  {
    n: "02",
    title: "Standards review",
    body: "A human editor checks the listing against S1–S6, the public quality bar below. Rejections come back with the exact standards failed and a one-click resubmit.",
    minutes: "In submission order",
  },
  {
    n: "03",
    title: "Editor decision",
    body: "Review usually takes 1–2 days. Approved listings go live immediately: no calendar, no waiting room.",
    minutes: "1–2 days",
  },
  {
    n: "04",
    title: "Listed in the directory",
    body: "Your listing is permanent and free: searchable, filterable, comparable, and open for honest reviews from day one.",
    minutes: "Forever",
  },
];

const REASSURANCE = [
  {
    icon: CheckCircle2,
    q: "Is submitting free?",
    a: "Yes. Submitting and being listed are free, forever.",
  },
  {
    icon: Clock3,
    q: "How long does review take?",
    a: "Review usually takes 1–2 days. Approved listings go live immediately. Track your position any time with the status tracker: same email, no account needed.",
  },
  {
    icon: RefreshCcw,
    q: "What if I'm rejected?",
    a: "You get the specific standard(s) your listing failed and a pre-filled resubmit with fixes. Fix it, resubmit, done.",
  },
  {
    icon: ShieldCheck,
    q: "What can I submit?",
    a: "Live, working AI products of any size, indie or funded. AI must be the core of the product, and the listing must be honest.",
  },
];

/** /submit — the maker-facing submission page. The wizard opens as an
 *  overlay from the CTA (layout-mounted), so no waitlist, no email capture
 *  on this page — the flow starts immediately. */
export default function SubmitPage() {
  return (
    <div className="bg-ink pb-16 md:pb-0">
      {/* Head */}
      <section className="relative overflow-hidden pt-14 pb-16">
        <div
          aria-hidden
          className="absolute top-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-ember/10 blur-[100px]"
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-mono text-xs tracking-[0.3em] text-ember-tint uppercase">
            For makers
          </p>
          <h1 className="mt-3 max-w-3xl text-5xl font-black tracking-tighter text-white md:text-6xl">
            Submit your tool to the directory.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/60">
            Submitting is free and open: no waitlist, no invite. Approved
            listings go live in the directory, in front of people who search
            for AI tools every day.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <SubmitOpenButton
              label="Start the submission wizard"
              className="h-12 px-6 text-base"
            />
            <p className="font-mono text-xs tracking-[0.2em] text-white/60 uppercase">
              6 standards · 7 categories · $0
            </p>
          </div>
        </div>
      </section>

      {/* Timeline — what happens after you submit */}
      <section className="border-t border-white/10 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-black tracking-tighter text-white md:text-4xl">
            After you submit.
          </h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {TIMELINE.map((step) => (
              <li
                key={step.n}
                className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6"
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm text-ember-tint">{step.n}</p>
                  <p className="font-mono text-xs tracking-wider text-white/55 uppercase">
                    {step.minutes}
                  </p>
                </div>
                <h3 className="mt-3 text-lg font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <StatusTrackerOpenButton />
          </div>
        </div>
      </section>

      {/* Standards — the quality bar, mono rows */}
      <section className="border-t border-white/10 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <p className="font-mono text-xs tracking-[0.3em] text-ember-tint uppercase">
            The quality bar · public
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tighter text-white md:text-4xl">
            Every tool passes all six. Before it&apos;s listed.
          </h2>
          <ul role="list" className="mt-8 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
            {STANDARDS.map((s) => (
              <li key={s.id} className="flex gap-4 p-5">
                <span className="shrink-0 font-mono text-sm text-ember-tint">{s.id}</span>
                <div>
                  <h3 className="font-bold text-white">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/55">{s.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm italic text-white/60">
            Not live yet? Submit when you are. The directory takes submissions
            every day.
          </p>
        </div>
      </section>

      {/* Reassurance */}
      <section className="border-t border-white/10 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-black tracking-tighter text-white md:text-4xl">
            Fair questions.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {REASSURANCE.map((r) => (
              <div
                key={r.q}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
              >
                <r.icon className="size-5 text-ember-tint" aria-hidden />
                <h3 className="mt-3 font-bold text-white">{r.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{r.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative overflow-hidden border-t border-white/10 py-20">
        <div
          aria-hidden
          className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-ember/20 blur-[100px]"
        />
        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-4xl font-black tracking-tighter text-white md:text-5xl">
            The directory is open.
          </h2>
          <p className="mt-3 text-white/60">
            Submit your tool. Get listed. Get discovered.
          </p>
          <div className="mt-8">
            <SubmitOpenButton
              label="Submit your tool"
              className="h-12 px-8 text-base"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
