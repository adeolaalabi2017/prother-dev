/**
 * Shared constants for the dynamic OG image route (/api/og).
 * Server-side only consumers (route.tsx / generateMetadata) — no client use.
 */

/**
 * Tailwind gradient classes (see lib/submit.ts GRADIENTS) carry no color
 * information at runtime, so the OG renderer maps each class pair to real
 * hex stops. Keep in sync with GRADIENTS.
 */
export const GRADIENT_HEX: Record<string, [string, string]> = {
  "from-orange-400 to-rose-600": ["#fb923c", "#e11d48"],
  "from-amber-400 to-orange-700": ["#fbbf24", "#c2410c"],
  "from-orange-300 to-red-500": ["#fdba74", "#ef4444"],
  "from-orange-500 to-purple-700": ["#f97316", "#7e22ce"],
  "from-amber-500 to-stone-700": ["#f59e0b", "#44403c"],
  "from-lime-400 to-emerald-700": ["#a3e635", "#047857"],
  "from-emerald-400 to-teal-800": ["#34d399", "#115e59"],
  "from-stone-400 to-orange-800": ["#a8a29e", "#9a3412"],
  "from-zinc-400 to-slate-700": ["#a1a1aa", "#334155"],
  "from-rose-400 to-orange-600": ["#fb7185", "#ea580c"],
  "from-amber-300 to-orange-700": ["#fcd34d", "#c2410c"],
  "from-orange-400 to-yellow-600": ["#fb923c", "#ca8a04"],
};

export const OG_FALLBACK_GRADIENT: [string, string] = ["#fb923c", "#e11d48"];

/** Palette shared by both OG card layouts (Prother design tokens). */
export const OG_COLORS = {
  ink: "#0a0a0a",
  coal: "#141210",
  cream: "#f1ede4",
  ember: "#ff6a00",
  emberHot: "#ff8a3d",
  white: "#ffffff",
  white70: "rgba(255,255,255,0.70)",
  white50: "rgba(255,255,255,0.50)",
  white35: "rgba(255,255,255,0.35)",
  white18: "rgba(255,255,255,0.18)",
  white08: "rgba(255,255,255,0.08)",
} as const;

/** satori-safe truncation (no line-clamp support). */
export function clamp(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}
