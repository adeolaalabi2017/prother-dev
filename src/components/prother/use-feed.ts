"use client";

import { useCallback, useEffect, useState } from "react";
import type { FeedResponse } from "@/lib/prother";

/**
 * Shared feed fetch with module-level dedupe — Hero (todayCount)
 * and LaunchFeed (full payload) hit the API exactly once per page load.
 * `refresh(force)` bypasses the cache (used for the UTC-midnight rollover).
 */
let feedPromise: Promise<FeedResponse> | null = null;

export function fetchFeed(force = false): Promise<FeedResponse> {
  if (force || !feedPromise) {
    feedPromise = fetch("/api/feed").then((res) => {
      if (!res.ok) throw new Error(`Feed failed: ${res.status}`);
      return res.json() as Promise<FeedResponse>;
    });
  }
  return feedPromise;
}

export function useFeed() {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchFeed()
      .then((data) => {
        if (alive) setFeed(data);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : "Feed unavailable");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Editor decisions (approve/reject) change tomorrow's teasers — refetch.
  useEffect(() => {
    const onFeedRefresh = () => {
      fetchFeed(true)
        .then((data) => setFeed(data))
        .catch(() => {});
    };
    window.addEventListener("prother:feed-refresh", onFeedRefresh);
    return () => window.removeEventListener("prother:feed-refresh", onFeedRefresh);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchFeed(true);
      setFeed(data);
    } catch {
      /* keep previous feed on refresh failure */
    }
  }, []);

  return { feed, loading, error, refresh };
}
