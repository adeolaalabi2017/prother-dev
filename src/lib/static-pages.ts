/**
 * Editable static page copy (Site settings channel).
 *
 * Pages keep their baked defaults here; a stored setting key
 * (`page.about` / `page.advertise` / `page.privacy` / `page.terms`)
 * overrides any subset of fields: kicker, title, updated, intro, and
 * sections (H/P pairs, used by the legal pages). Missing fields and bad
 * JSON always fall back to the baked defaults — a broken setting can
 * never 500 a page.
 */
export type StaticSection = { h: string; p: string };

export type StaticPageCopy = {
  kicker: string;
  title: string;
  updated?: string;
  intro: string;
  /** Legal pages render these H/P sections. Empty = keep baked sections. */
  sections: StaticSection[];
};

export const STATIC_PAGE_KEYS = ["page.about", "page.advertise", "page.privacy", "page.terms"] as const;
export type StaticPageKey = (typeof STATIC_PAGE_KEYS)[number];

export const STATIC_PAGE_LABELS: Record<StaticPageKey, string> = {
  "page.about": "About",
  "page.advertise": "Advertise",
  "page.privacy": "Privacy Policy",
  "page.terms": "Terms of Service",
};

const CONTACT = "makers@prother.dev";

export const DEFAULT_PAGES: Record<StaticPageKey, StaticPageCopy> = {
  "page.about": {
    kicker: "About Prother",
    title: "Find the right AI tool.",
    intro:
      "Prother is a curated search & discovery platform for AI products and tools, every listing reviewed against published standards, organized into 8 categories, and rated by honest reviews. This page is the whole story: how the directory works, what we build for, and the bar every listing clears.",
    sections: [], // rich section components render below
  },
  "page.advertise": {
    kicker: "Advertise",
    title: "Put your product in front of builders.",
    intro:
      "Clearly-labeled placements, one sponsor per slot, cookieless audience measurement. Direct sale, no middlemen.",
    sections: [],
  },
  "page.privacy": {
    kicker: "Legal",
    title: "Privacy Policy",
    updated: "Last updated: September 25, 2026",
    intro: `Prother is a directory for discovering AI tools. This policy explains what data we collect, why, and the choices you have. Questions: ${CONTACT}.`,
    sections: [
      {
        h: "Accounts",
        p: "Signing in is optional: browsing, searching, and comparing work without an account. If you create one (email magic link or Google OAuth), we store your email address, plus the name, handle, bio, and avatar you choose. Google sign-in additionally receives the basic profile Google shares (name, email, profile picture). Sessions last 30 days; signing out ends them immediately, and banning an account revokes all of its live sessions.",
      },
      {
        h: "Content you create",
        p: "Reviews, comments, forum posts, collections, bookmarks, follows, tool submissions, ownership claims, and reports are stored so the site can display them, attribute them to you, and moderate them. Public content (reviews, posts, public collections) is visible to everyone, including search engines.",
      },
      {
        h: "Analytics: cookieless by design",
        p: "We count page views in aggregate (page x day, referrer host x device x day, error signatures x day) to understand traffic and report it to advertisers. We store no cookies, IP addresses, or user-agent strings for analytics: there is nothing personal to leak, so no consent banner is needed.",
      },
      {
        h: "Advertising",
        p: "Sponsored placements are sold directly and always labeled. We use no third-party advertising trackers, and we never sell personal data.",
      },
      {
        h: "Data storage and sharing",
        p: "Data is stored with our infrastructure providers (application database, file storage, and transactional email) and processed only to operate Prother. We disclose data only when required by law or to prevent abuse.",
      },
      {
        h: "Your rights",
        p: `You can edit your profile at any time. For a copy of your data or full account deletion (profile, content attributions, and sessions), email ${CONTACT} from your account address and we will action it promptly.`,
      },
      {
        h: "Changes",
        p: "Material changes to this policy will be noted here with a new revision date. Continued use of Prother after changes take effect constitutes acceptance.",
      },
    ],
  },
  "page.terms": {
    kicker: "Legal",
    title: "Terms of Service",
    updated: "Last updated: September 25, 2026",
    intro: `By using Prother you agree to these terms. If you don't agree, please don't use the site. Contact: ${CONTACT}.`,
    sections: [
      {
        h: "Accounts",
        p: "You must provide a valid email address and keep your sign-in method secure. You are responsible for activity under your account. We may suspend accounts that abuse the service.",
      },
      {
        h: "Listings and maker claims",
        p: "Tool listings must describe real, publicly usable products. Ownership claims must be truthful: claiming a tool you don't control, or submitting misleading pricing, features, or reviews, leads to removal and may lead to a ban. Listings are free; editors review every submission against our published listing standards before it goes live.",
      },
      {
        h: "Your content",
        p: `Reviews, comments, forum posts, and collections must be honest, lawful, and yours to share: no spam, harassment, hate, private data, or infringing material. You grant Prother a worldwide, non-exclusive license to display content you post, so the site can function (including search indexing and excerpts). You can delete your content and account at any time via ${CONTACT}.`,
      },
      {
        h: "Moderation",
        p: "Editors may edit, hide, or remove content and suspend accounts that breach these terms, with or without notice. Moderation decisions on rejected submissions include the failed standards so makers can fix and resubmit.",
      },
      {
        h: "Service as-is",
        p: "Prother is provided \"as is\" without warranties. Tool information (pricing, features, availability) changes quickly; we fact-check but can't guarantee every detail. To the maximum extent permitted by law, Prother is not liable for decisions you make based on directory content, nor for downtime or data loss.",
      },
      {
        h: "Changes",
        p: "We may update these terms; material changes will be noted here with a new revision date. Continued use after changes take effect constitutes acceptance.",
      },
    ],
  },
};

/** Parses a stored setting into a partial override; null when unset/broken. */
export function parseStaticPageOverride(
  raw: string | undefined
): Partial<StaticPageCopy> | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Record<string, unknown>;
    if (typeof d !== "object" || d === null) return null;
    const out: Partial<StaticPageCopy> = {};
    if (typeof d.kicker === "string" && d.kicker.trim()) out.kicker = d.kicker.trim().slice(0, 60);
    if (typeof d.title === "string" && d.title.trim()) out.title = d.title.trim().slice(0, 120);
    if (typeof d.updated === "string") out.updated = d.updated.trim().slice(0, 80) || undefined;
    if (typeof d.intro === "string" && d.intro.trim()) out.intro = d.intro.trim().slice(0, 2000);
    if (Array.isArray(d.sections)) {
      const sections = d.sections
        .filter(
          (s): s is { h: unknown; p: unknown } =>
            typeof s === "object" && s !== null && typeof (s as { h?: unknown }).h === "string" && typeof (s as { p?: unknown }).p === "string"
        )
        .slice(0, 60)
        .map((s) => ({
          h: (s.h as string).trim().slice(0, 120),
          p: (s.p as string).trim().slice(0, 4000),
        }))
        .filter((s) => s.h && s.p);
      out.sections = sections;
    }
    return out;
  } catch {
    return null;
  }
}

/** Merged copy for a page: baked defaults with any stored override applied. */
export function staticPageCopy(
  key: StaticPageKey,
  raw: string | undefined
): StaticPageCopy {
  const base = DEFAULT_PAGES[key];
  const override = parseStaticPageOverride(raw);
  if (!override) return base;
  return { ...base, ...override };
}
