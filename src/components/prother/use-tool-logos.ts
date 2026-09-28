"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api.js";

const CONVEX_LIVE =
  typeof process.env.NEXT_PUBLIC_CONVEX_URL === "string" &&
  process.env.NEXT_PUBLIC_CONVEX_URL.length > 0;

export const KNOWN_LOCAL_LOGOS: Record<string, string> = {
  openchamber: "/logos/openchamber.svg",
  nebula: "/logos/nebula.svg",
  "open-slide": "/logos/open-slide.png",
  paperclip: "/logos/paperclip.svg",
  linear: "/logos/linear.svg",
  openviking: "/logos/openviking.png",
  "julia-1": "/logos/julia-1.svg",
  jev: "/logos/jev.png",
  supermemory: "/logos/supermemory.svg",
  antigravity: "/logos/antigravity.png",
  aider: "/logos/aider.png",
  cursor: "/logos/cursor.svg",
  windsurf: "/logos/windsurf.svg",
};

/**
 * React hook to reactively resolve tool logos across all client surfaces.
 * Returns a lookup function (slug, fallback) => logoUrl | null.
 */
export function useToolLogos(): (
  slug?: string | null,
  fallback?: string | null
) => string | null {
  const dir = useQuery(
    api.tools.directory,
    CONVEX_LIVE ? { page: 1, pageSize: 200, sort: "featured" } : "skip"
  );

  const map = useMemo(() => {
    const m = new Map<string, string>(Object.entries(KNOWN_LOCAL_LOGOS));
    if (dir && "rows" in dir && Array.isArray(dir.rows)) {
      for (const r of dir.rows) {
        if (r.slug && r.logoUrl) {
          m.set(r.slug, r.logoUrl);
        }
      }
    }
    return m;
  }, [dir]);

  return (slug?: string | null, fallback?: string | null) => {
    if (slug) {
      const mapped = map.get(slug);
      if (mapped) return mapped;
      const local = KNOWN_LOCAL_LOGOS[slug];
      if (local) return local;
    }
    // Reject legacy AI-generated mock thumbnail URLs
    if (fallback && !fallback.startsWith("/api/media/")) {
      return fallback;
    }
    return null;
  };
}
