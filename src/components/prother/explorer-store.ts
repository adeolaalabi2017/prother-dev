"use client";

import { create } from "zustand";

/**
 * Module-level UI store shared by the header, feed rows, and the
 * ToolExplorer dialogs (detail modal + ⌘K command palette).
 */
type ExplorerState = {
  /** Slug of the tool shown in the detail modal, if any. */
  slug: string | null;
  /** Whether the ⌘K command palette is open. */
  searchOpen: boolean;
  openTool: (slug: string) => void;
  closeTool: () => void;
  setSearch: (open: boolean) => void;
};

export const useExplorer = create<ExplorerState>((set) => ({
  slug: null,
  searchOpen: false,
  openTool: (slug) => set({ slug }),
  closeTool: () => set({ slug: null }),
  setSearch: (searchOpen) => set({ searchOpen }),
}));
