"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * AnalyticsPing (Task 28) — the whole first-party analytics client.
 * One fire-and-forget POST per pathname change to /api/analytics/pv, which
 * aggregates into PageViewDaily (path × UTC day). Cookieless by design:
 * no cookies, no localStorage, no fingerprinting — the browser sends only
 * the current path. Internal surfaces (/admin, /api, /editor) are filtered
 * server-side too; the double check keeps those pages ping-free entirely.
 */
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
      body: JSON.stringify({ p: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
