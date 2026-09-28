"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api.js";

const CONVEX_LIVE =
  typeof process.env.NEXT_PUBLIC_CONVEX_URL === "string" &&
  process.env.NEXT_PUBLIC_CONVEX_URL.length > 0;

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
    CONVEX_LIVE ? { page: 1, pageSize: 100, sort: "featured" } : "skip"
  );

  const map = useMemo(() => {
    const m = new Map<string, string>();
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
    if (fallback) return fallback;
    if (!slug) return null;
    return map.get(slug) ?? null;
  };
}
