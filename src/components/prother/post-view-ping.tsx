"use client";

import { useEffect, useRef } from "react";

/**
 * One view ping per mount per slug — parity with the legacy ?post= overlay,
 * which POSTs /api/blog/[slug] once per open. No state, no render impact.
 */
export function PostViewPing({ slug }: { slug: string }) {
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (done.current === slug) return;
    done.current = slug;
    fetch(`/api/blog/${encodeURIComponent(slug)}`, { method: "POST" }).catch(
      () => {}
    );
  }, [slug]);
  return null;
}
