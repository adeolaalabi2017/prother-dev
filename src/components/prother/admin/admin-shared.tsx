"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/components/prother/forum-thread-actions";

/**
 * Shared building blocks for the Admin Console (Task 23-b module split).
 * admin-console.tsx and the sibling tab modules (users / reports / ads)
 * all import from here — one source of truth for the editor-key fetch
 * helper, the dark form atoms and the panel chrome.
 *
 * Everything is painted with Prother tokens ONLY (ink/coal panels,
 * white/10 borders, rounded-2xl, ember #FF6A00 as the single accent,
 * mono micro-labels). Demo key auth (`x-editor-key`); NextAuth P2.
 */

// ── key / fetch ──────────────────────────────────────────────────────────

export const KEY_STORAGE = "prother_editor_key";
export const DEMO_HINT = "ember-dev";

export function useAdminKey() {
  // Start locked on BOTH server and client first paint — reading
  // sessionStorage during the hydration render would mismatch the SSR'd
  // locked chip/gate (React 19 hydration error). The stored key is
  // restored in a microtask right after mount (async, so the
  // react-hooks/set-state-in-effect rule stays satisfied).
  const [key, setKey] = useState<string | null>(null);
  useEffect(() => {
    Promise.resolve().then(() => {
      const stored = sessionStorage.getItem(KEY_STORAGE);
      if (stored) setKey(stored);
    });
  }, []);
  const unlock = useCallback((k: string) => {
    sessionStorage.setItem(KEY_STORAGE, k);
    setKey(k);
  }, []);
  const lock = useCallback(() => {
    sessionStorage.removeItem(KEY_STORAGE);
    setKey(null);
  }, []);
  return { key, unlock, lock };
}

export function adminFetch(key: string, url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      "x-editor-key": key,
      ...init?.headers,
    },
  }).then(async (r) => {
    if (r.status === 401) throw new Error("401");
    return r;
  });
}

// ── dark form atoms ──────────────────────────────────────────────────────

export const inputCx =
  "border-white/10 bg-white/5 text-white placeholder:text-white/55 text-sm";
export const labelCx =
  "font-mono text-xs tracking-[0.2em] text-white/60 uppercase";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={labelCx}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-white/55">{hint}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-14 text-white/55">
      <Loader2 className="size-5 animate-spin" aria-hidden />
    </div>
  );
}

/** Card shell shared by dashboard panels (reference density, Prother skin). */
export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Compact mono stat for the Users/Ads stat strips (overview uses StatCard). */
export function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        accent ? "border-ember/40 bg-ember/[0.06]" : "border-white/10 bg-white/[0.02]"
      )}
    >
      <p className="font-mono text-xs tracking-[0.2em] text-white/60 uppercase">
        {label}
      </p>
      <p className="mt-1 text-xl font-black tracking-tight text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

/** Inline load-failure card with retry (compact sibling of the overview one). */
export function LoadError({
  label,
  onRetry,
}: {
  label: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-400/25 bg-red-400/[0.04] p-8 text-center">
      <p className="font-mono text-xs tracking-[0.25em] text-red-300 uppercase">
        {label} unavailable
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-white/60">
        Couldn&apos;t load data. Check the admin key or network, then retry.
      </p>
      <Button
        onClick={onRetry}
        className="mt-5 rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal"
      >
        <RotateCcw className="size-4" aria-hidden />
        Retry
      </Button>
    </div>
  );
}

// ── hydration-safe relative time ─────────────────────────────────────────
// Before mount: stable UTC date (identical on server + client). After
// mount: "3h ago" (reuses the forums timeAgo). No mismatch by construction.

const noopSubscribe = () => () => {};
const trueSnapshot = () => true;
const falseSnapshot = () => false;

export function Age({ iso, className }: { iso: string; className?: string }) {
  const mounted = useSyncExternalStore(noopSubscribe, trueSnapshot, falseSnapshot);
  return (
    <span className={className}>
      {mounted ? timeAgo(iso) : new Date(iso).toISOString().slice(0, 10)}
    </span>
  );
}
