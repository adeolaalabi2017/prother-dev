/**
 * The Prother quality bar (PRD §10.4 / Appendix E) — shared by the
 * standards section, tool detail API, and tool detail modal.
 * Client-safe: no database imports here.
 */
export type StandardCheck = {
  id: string;
  title: string;
  blurb: string;
  passed: boolean;
};

export const STANDARD_DEFS: ReadonlyArray<{ id: string; title: string; blurb: string }> = [
  {
    id: "S1",
    title: "Live & accessible",
    blurb: "The URL resolves and the product is usable right now.",
  },
  {
    id: "S2",
    title: "AI-native",
    blurb: "AI is the core of the product, not a checkbox.",
  },
  {
    id: "S3",
    title: "Complete listing",
    blurb: "Clear name, honest tagline, working links, accurate pricing.",
  },
  {
    id: "S4",
    title: "Honest presentation",
    blurb: "No fake 'free', no inflated claims, no manufactured social proof.",
  },
  {
    id: "S5",
    title: "Safe & legal",
    blurb: "No malware, phishing, or violations of model providers' policies.",
  },
  {
    id: "S6",
    title: "English listing",
    blurb: "The tool may serve any market. The listing itself is in English.",
  },
];
