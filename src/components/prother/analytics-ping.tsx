"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * AnalyticsPing (Task 28) — the whole first-party analytics client.
 * One fire-and-forget POST per pathname change to /api/analytics/pv, which
 * aggregates into PageViewDaily (path × UTC day) and PageViewSourceDaily
 * (referrer host × coarse device × day). Cookieless by design: no cookies,
 * no localStorage, no fingerprinting — the browser sends the current path,
 * the external referrer HOST only (never the full URL or query), and a
 * width-derived device label. Internal surfaces (/admin, /api, /editor)
 * are filtered server-side too; the double check keeps those pages
 * ping-free entirely.
 */

/** Coarse device label from viewport width (not a fingerprint). */
function deviceLabel(): string {
  if (typeof window === "undefined") return "other";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1180) return "tablet";
  return "desktop";
}

/** External referrer hostname only, or "" for direct/unknown. */
function referrerHost(): string {
  if (typeof document === "undefined" || !document.referrer) return "";
  try {
    const u = new URL(document.referrer);
    return u.host === window.location.host ? "" : u.host;
  } catch {
    return "";
  }
}

export function AnalyticsPing() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/editor")
    ) {
      last.current = pathname;
      return;
    }
    last.current = pathname;
    fetch("/api/analytics/pv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        p: pathname,
        r: referrerHost(),
        d: deviceLabel(),
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
