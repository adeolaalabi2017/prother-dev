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
    const sync = () => {
      // The deep-link overlay stack is a HOMEPAGE feature (?tool=/?category=/
      // ?compare=… are legacy single-route deep links, Task 25 era). Real
      // routes own their params now — /compare?category=… (Task 32) must not
      // open the category overlay, and /tools?q=… must never replay overlays.
      if (window.location.pathname !== "/") {
        const st = useExplorer.getState();
        if (st.slug || st.postSlug || st.categoryView || st.collectionSlug || st.compareOpen) {
          st.closeTool({ sync: false });
          st.closePost({ sync: false });
          st.closeCategory({ sync: false });
          st.closeCompare({ sync: false });
          st.closeCollection({ sync: false });
        }
        return;
      }
      useExplorer.getState().syncFromUrl(window.location.search);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  return null;
}
