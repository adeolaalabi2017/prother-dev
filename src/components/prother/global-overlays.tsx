"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CompareTray } from "./compare-tray";
import { DeepLinkHost } from "./deep-link-host";
import { BackToTop } from "./back-to-top";
import { ToolExplorerHost } from "./tool-explorer-host";
import { useExplorer } from "./explorer-store";

const EditorConsole = dynamic(
  () => import("./editor-console").then((m) => m.EditorConsole),
  { ssr: false },
);
const CollectionsMineFullPage = dynamic(
  () =>
    import("./collections-mine-full-page").then(
      (m) => m.CollectionsMineFullPage,
    ),
  { ssr: false },
);
const SavedFullPage = dynamic(
  () => import("./saved-full-page").then((m) => m.SavedFullPage),
  { ssr: false },
);
const CollectionFullPage = dynamic(
  () => import("./collection-full-page").then((m) => m.CollectionFullPage),
  { ssr: false },
);
const CategoryFullPage = dynamic(
  () => import("./category-full-page").then((m) => m.CategoryFullPage),
  { ssr: false },
);
const CompareFullPage = dynamic(
  () => import("./compare-full-page").then((m) => m.CompareFullPage),
  { ssr: false },
);
const PostFullPage = dynamic(
  () => import("./post-full-page").then((m) => m.PostFullPage),
  { ssr: false },
);
const ToolFullPage = dynamic(
  () => import("./tool-full-page").then((m) => m.ToolFullPage),
  { ssr: false },
);

/**
 * Latch: false until `open` first turns true, then true for good. Dialogs
 * mount on first open (so their chunk downloads only then) and stay mounted,
 * which keeps their AnimatePresence exit animations working on close.
 * setState during render is React's documented derived-state pattern.
 */
function useOpenedOnce(open: boolean): boolean {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened || open;
}

/**
 * Client-only host for interactive overlays and deep-link full-page modals.
 * Dynamic imports with ssr:false keep these out of the server-rendered root
 * layout, and each overlay renders only once its store flag is set: a
 * `next/dynamic` chunk downloads on first render, so mounting them all
 * unconditionally fetched every overlay's code (and ran its hooks) on every
 * route. Full pages have no exit animation, so they mount and unmount with
 * their flag; dialogs latch open via useOpenedOnce.
 */
export function GlobalOverlays() {
  const editorOpen = useOpenedOnce(useExplorer((s) => s.editorOpen));
  const mineOpen = useExplorer((s) => s.mineView !== null);
  const savedOpen = useExplorer((s) => s.savedView !== null);
  const collectionOpen = useExplorer((s) => s.collectionSlug !== null);
  const categoryOpen = useExplorer((s) => s.categoryView !== null);
  const compareOpen = useExplorer((s) => s.compareOpen);
  const postOpen = useExplorer((s) => s.postSlug !== null);
  const toolOpen = useExplorer((s) => s.slug !== null);

  // ⌘⇧E opens the editor console. Lives here, not in EditorConsole, because
  // the console no longer mounts until it is first opened.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        useExplorer.getState().setEditorOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <ToolExplorerHost />
      {editorOpen && <EditorConsole />}
      <CompareTray />
      <DeepLinkHost />
      {mineOpen && <CollectionsMineFullPage />}
      {savedOpen && <SavedFullPage />}
      {collectionOpen && <CollectionFullPage />}
      {categoryOpen && <CategoryFullPage />}
      {compareOpen && <CompareFullPage />}
      {postOpen && <PostFullPage />}
      {toolOpen && <ToolFullPage />}
      <BackToTop />
    </>
  );
}
