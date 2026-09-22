"use client";

import { useCallback, useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Check,
  Flag,
  Scale,
  Share2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useExplorer } from "./explorer-store";
import { useBookmark } from "./use-bookmarks";
import { ReportDialog } from "./report-dialog";

/**
 * Client island for the SSR tool page (Task 25) — the interactive sliver of
 * /tools/[slug]:
 *  · VISIT   → the primary outbound link to the tool's website.
 *  · SAVE    → the shared useBookmark store ("tool", slug) so the Saved
 *    overlay (?saved=mine) and the overlay's save button stay in sync.
 *  · COMPARE → the shared explorer-store compare tray (up to two tools).
 *  · SHARE   → navigator.share with clipboard fallback on the clean URL
 *    /tools/<slug>.
 *  · REPORT  → the shared ReportDialog with the overlay's exact props.
 */

export function ToolDetailActions({
  slug,
  name,
  websiteUrl,
}: {
  slug: string;
  name: string;
  /** Outbound link to the tool's site. */
  websiteUrl: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const addCompare = useExplorer((s) => s.addCompare);
  const removeCompare = useExplorer((s) => s.removeCompare);
  const compareSlugs = useExplorer((s) => s.compare);

  const inCompare = compareSlugs.includes(slug);
  const compareFull = compareSlugs.length >= 2 && !inCompare;

  const onCompare = useCallback(() => {
    if (inCompare) removeCompare(slug);
    else if (!compareFull) addCompare(slug);
  }, [slug, inCompare, compareFull, addCompare, removeCompare]);

  // Same store/wiring as the overlay (Task 23): targetType "tool",
  // targetId = slug, label + href exactly as tool-full-page passes them.
  const {
    bookmarked,
    pending: bookmarkPending,
    toggle: toggleBookmark,
  } = useBookmark("tool", slug);

  const onBookmark = useCallback(() => {
    void toggleBookmark({ label: name, href: `/?tool=${slug}` });
  }, [toggleBookmark, name, slug]);

  const onShare = useCallback(async () => {
    const url = `${window.location.origin}/tools/${slug}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${name} — Prother`, url });
        return;
      } catch (err) {
        // User dismissed the share sheet — not an error.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Unsupported-ish or denied → fall through to the clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast({ title: "Link copied" });
    } catch {
      toast({
        title: "Could not copy the link",
        description: url,
        variant: "destructive",
      });
    }
  }, [slug, name, toast]);

  const iconBtn =
    "inline-flex size-11 items-center justify-center rounded-full border bg-white/[0.03] transition-colors hover:bg-white/[0.08]";

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={`${name} actions`}>
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        aria-label={`Visit ${name} website`}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-ember px-5 text-sm font-black tracking-wide text-[#0A0A0A] transition hover:bg-ember-hot"
      >
        Visit website
        <ArrowUpRight className="size-4" aria-hidden />
      </a>

      <button
        type="button"
        aria-label={bookmarked ? `Remove ${name} from saved` : `Save ${name} for later`}
        aria-pressed={bookmarked}
        disabled={bookmarkPending}
        onClick={onBookmark}
        className={cn(
          iconBtn,
          "border-white/10 hover:border-ember/40",
          bookmarked ? "text-ember" : "text-white/70 hover:text-ember"
        )}
      >
        {bookmarked ? (
          <BookmarkCheck className="size-4 fill-ember" aria-hidden />
        ) : (
          <Bookmark className="size-4" aria-hidden />
        )}
      </button>

      <button
        type="button"
        aria-label={
          inCompare
            ? `Remove ${name} from comparison`
            : compareFull
              ? "Comparison is full — remove a tool first"
              : `Add ${name} to comparison`
        }
        aria-pressed={inCompare}
        disabled={compareFull}
        onClick={onCompare}
        className={cn(
          iconBtn,
          "border-white/10 hover:border-ember/40",
          inCompare ? "text-ember" : "text-white/70 hover:text-ember",
          compareFull && "opacity-40"
        )}
      >
        <Scale className="size-4" aria-hidden />
      </button>

      <button
        type="button"
        aria-label={`Share ${name}`}
        onClick={() => void onShare()}
        className={cn(
          iconBtn,
          "border-white/10 hover:border-ember/40",
          copied ? "text-mint" : "text-white/70 hover:text-ember"
        )}
      >
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Share2 className="size-4" aria-hidden />
        )}
      </button>

      <button
        type="button"
        aria-label={`Report ${name}`}
        onClick={() => setReportOpen(true)}
        className={cn(
          iconBtn,
          "border-white/10 text-white/40 hover:border-ember/40 hover:text-ember"
        )}
      >
        <Flag className="size-4" aria-hidden />
      </button>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="tool"
        targetId={slug}
        targetLabel={name}
      />
    </div>
  );
}
