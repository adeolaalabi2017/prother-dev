"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useExplorer } from "./explorer-store";

/**
 * Keeps the full-page deep-link system in sync with the URL. The store is
 * re-synced:
 *  - on mount: replays the current ?tool/?post/?category/?compare/
 *    ?collection/?mine/?saved params (plus legacy #tool/#post hashes)
 *  - on popstate (browser Back/Forward), so pushed full pages close/open
 *    naturally with the back button
 *  - on every client-side route change (`<Link>`, `router.push`), which does
 *    not fire popstate. Without this, an overlay opened on one route kept
 *    covering the next one, and every real link inside an overlay had to
 *    close it by hand.
 *
 * Scope of each overlay:
 *  - tool/post/category/compare/collection are HOMEPAGE overlays (legacy
 *    single-route deep links, Task 25 era). Real routes own their params now:
 *    /compare?category=… (Task 32) must not open the category overlay, and
 *    /tools?q=… must never replay overlays. Off "/" they are always closed.
 *  - mine/saved are account overlays opened from the header on any route.
 *    They follow their own ?mine=/?saved= param on every route, so they
 *    survive opening on /tools but close on Back or on navigating away
 *    (the next route's URL no longer carries the param).
 *
 * The open and close store actions own forward navigation (pushState);
 * this host only ever READS the URL.
 */
export function DeepLinkHost() {
  const pathname = usePathname();

  useEffect(() => {
    const sync = () => {
      if (window.location.pathname === "/") {
        useExplorer.getState().syncFromUrl(window.location.search);
        return;
      }
      const st = useExplorer.getState();
      st.closeTool({ sync: false });
      st.closePost({ sync: false });
      st.closeCategory({ sync: false });
      st.closeCompare({ sync: false });
      st.closeCollection({ sync: false });

      const sp = new URLSearchParams(window.location.search);
      const mine = sp.get("mine");
      const saved = sp.get("saved");
      if (mine) {
        if (st.mineView !== mine) st.openMine(mine, { sync: false });
      } else {
        st.closeMine({ sync: false });
      }
      if (saved) {
        if (st.savedView !== saved) st.openSaved(saved, { sync: false });
      } else {
        st.closeSaved({ sync: false });
      }
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [pathname]);

  return null;
}
