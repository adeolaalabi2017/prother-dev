"use client";

import { MailSearch } from "lucide-react";
import { useExplorer } from "./explorer-store";

/**
 * Opens the maker status tracker overlay (layout-mounted, works on any
 * route). Used on /submit so makers can check their queue position.
 */
export function StatusTrackerOpenButton() {
  const setTrackOpen = useExplorer((s) => s.setTrackOpen);
  return (
    <button
      type="button"
      onClick={() => setTrackOpen(true)}
      className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-transparent px-4 py-2.5 font-mono text-sm font-semibold tracking-wider text-white/70 uppercase transition-colors hover:border-ember/50 hover:text-ember"
    >
      <MailSearch className="size-4" aria-hidden />
      Check your submission status
    </button>
  );
}
