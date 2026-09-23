"use client";

import { useEffect, useState } from "react";

/**
 * Client-side read of the CMS-managed site copy (Task 32) — shared,
 * module-level cache so every consumer (footer, future surfaces) reuses one
 * /api/site request per session. Blanks fall back in the consumer.
 */
let cache: Record<string, string> | null = null;
let inflight: Promise<Record<string, string>> | null = null;

function load(): Promise<Record<string, string>> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/site")
      .then((r) => r.json() as Promise<{ settings?: Record<string, string> }>)
      .then((d) => {
        cache = d.settings ?? {};
        return cache;
      })
      .catch(() => {
        cache = {};
        return cache;
      });
  }
  return inflight;
}

export function useSiteSettings(): Record<string, string> {
  const [settings, setSettings] = useState<Record<string, string> | null>(cache);

  useEffect(() => {
    let alive = true;
    load().then((s) => {
      if (alive) setSettings(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  return settings ?? {};
}
