"use client";

import dynamic from "next/dynamic";
import { CompareTray } from "./compare-tray";
import { DeepLinkHost } from "./deep-link-host";
import { BackToTop } from "./back-to-top";
import { ToolExplorerHost } from "./tool-explorer-host";

const SubmitWizard = dynamic(
  () => import("./submit-wizard").then((m) => m.SubmitWizard),
  { ssr: false },
);
const StatusTracker = dynamic(
  () => import("./status-tracker").then((m) => m.StatusTracker),
  { ssr: false },
);
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
 * Client-only host for interactive overlays and deep-link full-page modals.
 * Dynamic imports with ssr:false ensure these heavy components and their
 * dependencies are not bundled into the server-rendered root layout.
 */
export function GlobalOverlays() {
  return (
    <>
      <ToolExplorerHost />
      <SubmitWizard />
      <StatusTracker />
      <EditorConsole />
      <CompareTray />
      <DeepLinkHost />
      <CollectionsMineFullPage />
      <SavedFullPage />
      <CollectionFullPage />
      <CategoryFullPage />
      <CompareFullPage />
      <PostFullPage />
      <ToolFullPage />
      <BackToTop />
    </>
  );
}
