"use client";

import { useEffect } from "react";
import { useExplorer } from "./explorer-store";

/**
 * Boots the full-page deep-link system and keeps it in sync with browser
 * history:
 *  - on mount: replays the current ?tool/?post/?category/?compare/
 *    ?collection/?mine params (plus legacy #tool/#post hashes) into the store
 *  - on popstate (browser Back/Forward): re-syncs store from URL, so pushed
 *    full pages close/open naturally with the back button
 *
 * The open and close store actions own forward navigation (pushState);
 * this host only ever READS the URL.
 */
export function DeepLinkHost() {
  useEffect(() => {
    const sync = () => useExplorer.getState().syncFromUrl(window.location.search);
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  return null;
}
