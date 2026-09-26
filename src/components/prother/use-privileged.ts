"use client";

import { useEffect, useState } from "react";

/**
 * Owner-only affordance gate — header/footer admin + editor entries render
 * only when this tab holds an unlock key. Guests get zero entries in the
 * DOM (not CSS-hidden). The invisible doors (⌘⇧A → /admin, ⌘⇧E → editor)
 * stay always-on, so the owner unlocks once per tab and entries appear.
 *
 * KEY_STORAGE mirrors admin-shared.tsx (kept as a local const so the
 * header/footer never pull the admin console's heavy import chain).
 * Starts locked on first paint (SSR/hydration-safe), restores async.
 */

const KEY_STORAGE = "prother_editor_key";

export const PRIV_UNLOCK_EVENT = "prother:unlock";
export const PRIV_LOCK_EVENT = "prother:lock";

export function usePrivileged(): boolean {
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    const check = () =>
      setUnlocked(sessionStorage.getItem(KEY_STORAGE) != null);
    // Async restore — no set-state-in-effect lint hit, no hydration mismatch.
    Promise.resolve().then(check);
    window.addEventListener(PRIV_UNLOCK_EVENT, check);
    window.addEventListener(PRIV_LOCK_EVENT, check);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      window.removeEventListener(PRIV_UNLOCK_EVENT, check);
      window.removeEventListener(PRIV_LOCK_EVENT, check);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);
  return unlocked;
}
