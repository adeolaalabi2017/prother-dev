"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Link2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Full-page view shells — the proper replacement for the floating dialogs.
 * A FullPageShell is a fixed overlay page (own scroll, locked body scroll,
 * Escape-to-close, breadcrumb top bar, share + close buttons). Deep-link
 * pages (journal post, category, launch archive, tool) render inside one.
 *
 * Stacking: pages may mount on top of each other (e.g. a tool page opened
 * from the category page). shellStack keeps a mount-ordered token list so
 * Escape only closes the TOPMOST page, and each shell restores the body
 * overflow value it captured at mount (LIFO-safe).
 */

/** Mount-ordered registry of open shells — last entry is the topmost page. */
const shellStack: symbol[] = [];

export type BreadcrumbSegment = {
  label: string;
  /** When set the segment is a button (hover:ember); otherwise plain text. */
  onClick?: () => void;
};

export function FullPageShell(props: {
  /** Mono uppercase label rendered at the top of the content column. */
  kicker?: string;
  /** Breadcrumb shown left of the top bar; "›" separators. */
  breadcrumb?: BreadcrumbSegment[];
  /** ✕ button + Escape key. */
  onClose: () => void;
  /** Renders a copy-link icon button that copies this URL to the clipboard. */
  shareUrl?: string;
  /** Content column max-w-5xl instead of the default max-w-3xl. */
  wide?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const { kicker, breadcrumb, onClose, shareUrl, wide = false, ariaLabel, children } = props;
  const reduceMotion = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  // Body scroll lock. The previous value is captured at mount so stacked
  // pages restore correctly in LIFO order.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Focus the close button so keyboard users land inside the page.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Escape closes the topmost shell only.
  useEffect(() => {
    const token = Symbol("full-page-shell");
    shellStack.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (shellStack[shellStack.length - 1] !== token) return;
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const i = shellStack.indexOf(token);
      if (i >= 0) shellStack.splice(i, 1);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const copyShare = useCallback(async () => {
    if (!shareUrl) return;
    try {
      const url = new URL(shareUrl, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable (insecure context) — nothing to swap */
    }
  }, [shareUrl]);

  const iconBtn =
    "flex size-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:border-ember/50 hover:text-ember disabled:pointer-events-none disabled:opacity-40";

  return (
    <motion.div
      role="region"
      aria-label={ariaLabel}
      className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-ink text-white"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {/* sticky top bar */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-ink/85 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
            {(breadcrumb ?? []).map((seg, i) => {
              const last = i === (breadcrumb ?? []).length - 1;
              return (
                <span key={`${seg.label}-${i}`} className="flex min-w-0 items-center gap-2">
                  {i > 0 && (
                    <span aria-hidden className="font-mono text-[10px] text-white/25">
                      ›
                    </span>
                  )}
                  {last || !seg.onClick ? (
                    <span
                      aria-current={last ? "page" : undefined}
                      className={cn(
                        "truncate font-mono text-[10px] uppercase tracking-[0.2em]",
                        last ? "text-white/80" : "text-white/45"
                      )}
                    >
                      {seg.label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={seg.onClick}
                      className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-white/45 transition-colors hover:text-ember"
                    >
                      {seg.label}
                    </button>
                  )}
                </span>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {shareUrl && (
              <button
                type="button"
                onClick={() => void copyShare()}
                aria-label={copied ? "Link copied" : "Copy link"}
                title={copied ? "Link copied" : "Copy link"}
                className={cn(iconBtn, copied && "border-mint/50 text-mint")}
              >
                {copied ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
              </button>
            )}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close page"
              title="Close (Esc)"
              className={iconBtn}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {/* content column */}
      <div
        className={cn(
          "mx-auto w-full px-4 pt-8 sm:px-6",
          wide ? "max-w-5xl" : "max-w-3xl"
        )}
        style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
      >
        {kicker && (
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            <span aria-hidden className="h-px w-6 bg-ember/70" />
            {kicker}
          </p>
        )}
        {children}
      </div>
    </motion.div>
  );
}

/** Loading state — three shimmering blocks; sits inside the shell's column. */
export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading" className="mt-1">
      <span className="sr-only">Loading…</span>
      <div aria-hidden className="flex flex-col gap-4">
        <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}

/** Error state — centered mono title + message + optional action button. */
export function PageError(props: {
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  const { title, message, action } = props;
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-ember">{title}</p>
      {message && <p className="max-w-md text-sm leading-relaxed text-white/50">{message}</p>}
      {action}
    </div>
  );
}
