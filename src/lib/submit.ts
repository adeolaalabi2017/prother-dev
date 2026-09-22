/**
 * Submission-wizard shared constants + helpers (PRD §11).
 * Client-safe: NO database imports here (lib/prother.ts pulls Prisma).
 */

/** Controlled tag vocabulary v1 (PRD §13), ≤5 per tool. */
export const TAG_VOCAB = [
  "open-source",
  "free-tier",
  "api-available",
  "self-hosted",
  "no-code",
  "enterprise",
  "browser-extension",
  "mobile",
] as const;
export type TagVocab = (typeof TAG_VOCAB)[number];

/** Normalize a URL to its registrable domain for the 1-per-domain rule. */
export function domainOf(rawUrl: string): string | null {
  try {
    const u = new URL(
      /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
    );
    return u.hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** Logo gradient choices (same families as the seeded catalog). */
export const GRADIENTS = [
  { value: "from-orange-400 to-rose-600", label: "Ember" },
  { value: "from-amber-400 to-orange-700", label: "Copper" },
  { value: "from-orange-300 to-red-500", label: "Signal" },
  { value: "from-orange-500 to-purple-700", label: "Dusk" },
  { value: "from-amber-500 to-stone-700", label: "Slate" },
  { value: "from-lime-400 to-emerald-700", label: "Moss" },
  { value: "from-emerald-400 to-teal-800", label: "Pine" },
  { value: "from-stone-400 to-orange-800", label: "Clay" },
  { value: "from-zinc-400 to-slate-700", label: "Steel" },
  { value: "from-rose-400 to-orange-600", label: "Blush" },
  { value: "from-amber-300 to-orange-700", label: "Nectar" },
  { value: "from-orange-400 to-yellow-600", label: "Honey" },
] as const;

/** Logo emoji choices (step ④ media). */
export const LOGO_EMOJIS = [
  "⬡", "🤖", "🧠", "💬", "🎨", "🎬", "🎙️", "📊", "⚙️", "🛡️",
  "⚖️", "✍️", "🔎", "🚀", "📈", "🔊", "📉", "💼", "🌐", "✅",
] as const;

/** Pricing model radio (PRD §11 step ③). */
export const PRICING_MODELS = [
  { value: "free", label: "Free", helper: "No paid tier — say why it stays free" },
  { value: "freemium", label: "Freemium", helper: "Free tier + paid upgrades" },
  { value: "paid", label: "Paid", helper: "Trial or demo must be visible" },
  { value: "open_source", label: "Open Source", helper: "Public repo required (S4)" },
] as const;
export type PricingModel = (typeof PRICING_MODELS)[number]["value"];

/** Full wizard form state. */
export type SubmitForm = {
  email: string;
  websiteUrl: string;
  name: string;
  isOwner: boolean;
  tagline: string;
  description: string;
  categorySlug: string;
  tags: TagVocab[];
  pricingModel: PricingModel;
  startingPrice: string;
  pricingNote: string;
  hasApi: boolean;
  githubUrl: string;
  docsUrl: string;
  twitterUrl: string;
  logoEmoji: string;
  logoGradient: string;
  confirmedLive: boolean;
  agreedStandards: boolean;
};

export const INITIAL_SUBMIT_FORM: SubmitForm = {
  email: "",
  websiteUrl: "",
  name: "",
  isOwner: true,
  tagline: "",
  description: "",
  categorySlug: "",
  tags: [],
  pricingModel: "freemium",
  startingPrice: "",
  pricingNote: "",
  hasApi: false,
  githubUrl: "",
  docsUrl: "",
  twitterUrl: "",
  logoEmoji: "⬡",
  logoGradient: "from-orange-400 to-rose-600",
  confirmedLive: false,
  agreedStandards: false,
};

/** Maker-facing submission status (PRD §11 "status tracking"). */
export type SubmissionStatus = "pending" | "approved" | "rejected";

/**
 * Payload used to re-open the wizard pre-filled from a rejected submission
 * ("Resubmit with fixes"). Confirm checkboxes are intentionally NOT carried
 * over — the maker must re-attest after fixing the cited standards.
 */
export type SubmitPrefill = {
  email: string;
  websiteUrl: string;
  name: string;
  tagline: string;
  description: string;
  categorySlug: string;
  tags: TagVocab[];
  pricingModel: PricingModel;
  startingPrice: string;
  pricingNote: string;
  hasApi: boolean;
  githubUrl: string;
  docsUrl: string;
  twitterUrl: string;
  logoEmoji: string;
  logoGradient: string;
};

export type SubmissionStatusItem = {
  id: string;
  name: string;
  tagline: string;
  domain: string;
  emoji: string;
  gradient: string;
  status: SubmissionStatus;
  createdAt: string;
  /** pending only — 1-based position in the review queue. */
  queuePosition: number | null;
  /** approved only — slug of the created Tool (opens the listing modal). */
  toolSlug: string | null;
  /** rejected only — "Failed: S1, S4 — note" (standards cited). */
  reviewNote: string | null;
  /** rejected only — form values to re-open the wizard pre-filled. */
  resubmit: SubmitPrefill | null;
};

/** Per-step field validation — mirrors the server's zod rules. */
export function validateStep(
  step: number,
  form: SubmitForm
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 0) {
    const domain = domainOf(form.websiteUrl);
    if (!domain || !domain.includes("."))
      errors.websiteUrl = "Enter your product's URL (e.g. yourtool.ai)";
    if (form.name.trim().length < 2) errors.name = "Name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errors.email = "We need an email for the review decision";
  }
  if (step === 1) {
    const t = form.tagline.trim();
    if (t.length < 5) errors.tagline = "At least 5 characters";
    else if (t.length > 60) errors.tagline = "Max 60 characters";
    const d = form.description.trim();
    if (d.length < 20) errors.description = "At least 20 characters";
    else if (d.length > 500) errors.description = "Max 500 characters";
    if (!form.categorySlug) errors.categorySlug = "Pick the closest category";
  }
  if (step === 2) {
    if (form.pricingModel === "open_source" && form.githubUrl.trim().length < 8)
      errors.githubUrl = "Open Source tools need a public GitHub URL";
    if (form.pricingModel === "paid" && form.startingPrice.trim().length < 1)
      errors.startingPrice = "Honest pricing — what does it start at? (S4)";
  }
  if (step === 4) {
    if (!form.confirmedLive)
      errors.confirmedLive = "Confirm your tool is live and usable right now";
    if (!form.agreedStandards)
      errors.agreedStandards = "You must confirm you've read the Listing Standards";
  }
  return errors;
}
