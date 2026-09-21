"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Bookmark, FolderHeart, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useExplorer } from "./explorer-store";

/**
 * Header sign-in / account widget (PRD F-37).
 *
 * Signed out  → "SIGN IN" mono button opening a popover with Google OAuth
 *               (only when configured) + the email magic-link flow
 *               (CSRF → POST /api/auth/signin/email → dev-inbox lookup).
 * Signed in   → avatar/@handle chip with a dropdown (my collections, sign out).
 * Loading     → skeleton chip.
 *
 * Other components can pop the sign-in popover via requestSignIn() — it
 * dispatches a "prother:auth-open" window event this component listens for.
 */

/** Ask any mounted AuthMenu to open its sign-in popover. */
export function requestSignIn() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("prother:auth-open"));
  }
}

// ── Constants ────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SEC = 30;
const MONO_LABEL = "font-mono text-[10px] uppercase tracking-[0.25em] text-white/40";

type ProviderMap = Record<string, unknown>;

/** Minimal inline Google "G" (no icon dependency). */
function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EB4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

export function AuthMenu() {
  const { status, data } = useSession();

  // Popover open state — also driven by the "prother:auth-open" event.
  const [open, setOpen] = useState(false);

  // Google is rendered only when /api/auth/providers exposes it (F-37).
  const [hasGoogle, setHasGoogle] = useState(false);

  // Magic-link flow state.
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [magicUrl, setMagicUrl] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  // Detect Google availability once.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/providers")
      .then((r) => (r.ok ? (r.json() as Promise<ProviderMap>) : {}))
      .then((providers) => {
        if (!cancelled && providers && "google" in providers) setHasGoogle(true);
      })
      .catch(() => {
        /* provider detection is best-effort; fall back to the muted row */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Other components dispatch "prother:auth-open" to request sign-in.
  useEffect(() => {
    const openMenu = () => setOpen(true);
    window.addEventListener("prother:auth-open", openMenu);
    return () => window.removeEventListener("prother:auth-open", openMenu);
  }, []);

  // Resend cooldown ticker.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  /**
   * Magic-link send: GET /api/auth/csrf for the token, POST it urlencoded to
   * /api/auth/signin/email (opaque redirect — NextAuth answers 302 either
   * way), then ask the dev inbox whether a link was actually minted.
   */
  const sendMagicLink = useCallback(async (addr: string) => {
    setSending(true);
    setError(null);
    setMagicUrl(null);
    try {
      const csrfRes = await fetch("/api/auth/csrf");
      if (!csrfRes.ok) throw new Error("Could not start sign-in — try again.");
      const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
      if (!csrfToken) throw new Error("Missing CSRF token — try again.");

      await fetch("/api/auth/signin/email", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email: addr, csrfToken }).toString(),
        redirect: "manual",
      });

      const inboxRes = await fetch(`/api/auth/dev-inbox?email=${encodeURIComponent(addr)}`);
      const inbox = (await inboxRes.json()) as { enabled?: boolean; url?: string | null };
      setMagicUrl(inbox.enabled && inbox.url ? inbox.url : null);
      setSentTo(addr);
      setResendIn(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — try again.");
    } finally {
      setSending(false);
    }
  }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const addr = email.trim();
    if (!EMAIL_RE.test(addr)) {
      setError("Enter a valid email address.");
      setSentTo(null);
      setMagicUrl(null);
      return;
    }
    void sendMagicLink(addr);
  };

  // ── Loading: skeleton chip ─────────────────────────────────────────────
  if (status === "loading") {
    return (
      <span
        role="status"
        aria-label="Loading session"
        className="inline-flex h-9 w-24 animate-pulse rounded-full bg-white/5"
      />
    );
  }

  // ── Signed in: avatar/@handle chip + dropdown ──────────────────────────
  if (status === "authenticated" && data?.user) {
    const user = data.user;
    const fallback = user.email?.split("@")[0] ?? "maker";
    const name = user.name || user.handle || fallback;
    const handle = user.handle || fallback;
    const letter = (name.trim()[0] || "P").toUpperCase();

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-haspopup="menu"
            aria-label={`Account menu for @${handle}`}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-3 transition-colors hover:border-ember/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
          >
            <span className="grid size-6 place-items-center rounded-full bg-ember/20 font-bold text-ember">
              {letter}
            </span>
            <span className="font-mono text-xs text-white/80">@{handle}</span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="z-[70] w-64 rounded-xl border border-white/10 bg-coal p-1 text-white shadow-xl shadow-black/40"
        >
          <DropdownMenuLabel className="px-2 py-2">
            <span className="block truncate font-mono text-xs font-semibold uppercase tracking-[0.15em] text-white">
              {name}
            </span>
            <span className="block truncate font-mono text-[10px] text-white/40">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10" />

          <DropdownMenuItem
            onSelect={() => useExplorer.getState().openMine("collections")}
            className="gap-2 rounded-lg px-2 py-2 text-sm text-white/80 focus:bg-white/10 focus:text-white"
          >
            <FolderHeart className="size-4 text-ember" aria-hidden />
            My collections &amp; follows
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => useExplorer.getState().openSaved("mine")}
            className="gap-2 rounded-lg px-2 py-2 text-sm text-white/80 focus:bg-white/10 focus:text-white"
          >
            <Bookmark className="size-4 text-ember" aria-hidden />
            Saved
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => void signOut({ callbackUrl: "/" })}
            className="gap-2 rounded-lg px-2 py-2 text-sm text-red-400 focus:bg-red-500/10 focus:text-red-300"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/10" />
          <div className={cn(MONO_LABEL, "px-2 pb-1 pt-1.5")}>Session · Database</div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // ── Signed out: SIGN IN button + popover ───────────────────────────────
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Sign in or create account"
          className="inline-flex h-9 items-center rounded-lg border border-white/15 bg-transparent px-3.5 font-mono text-[10px] uppercase tracking-[0.25em] text-ember transition-colors hover:border-ember/50 hover:bg-ember/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
        >
          Sign in
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="z-[70] w-[320px] rounded-xl border border-white/10 bg-coal p-4 text-white shadow-xl shadow-black/40"
      >
        <p className={MONO_LABEL}>Sign in / Create account</p>
        <p className="mt-1.5 text-xs leading-snug text-white/60">
          Upvote, review, save collections, claim listings.
        </p>

        {/* Google OAuth — only when configured on the server */}
        {hasGoogle ? (
          <button
            type="button"
            onClick={() => void signIn("google", { callbackUrl: "/" })}
            className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2.5 rounded-lg border border-white/15 bg-white/[0.03] font-mono text-[10px] uppercase tracking-[0.25em] text-white/80 transition-colors hover:border-ember/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
          >
            <GoogleGlyph />
            Continue with Google
          </button>
        ) : (
          <div
            aria-disabled="true"
            className="mt-4 flex min-h-9 items-center justify-center rounded-lg border border-white/10 px-2 py-2 text-center font-mono text-[9px] uppercase leading-relaxed tracking-[0.2em] text-white/30 opacity-50"
          >
            Google — configure GOOGLE_CLIENT_ID to enable
          </div>
        )}

        {/* Divider */}
        <div className="my-4 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-white/10" />
          <span className={MONO_LABEL}>Or magic link</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        {/* Magic-link form */}
        <form onSubmit={onSubmit} noValidate className="space-y-2">
          <label htmlFor="prother-auth-email" className={MONO_LABEL}>
            Email
          </label>
          <Input
            id="prother-auth-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@studio.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            disabled={sending}
            className="h-9 rounded-lg border-white/15 bg-white/[0.03] text-sm text-white placeholder:text-white/30 focus-visible:border-ember/50 focus-visible:ring-ember/20"
          />
          <Button
            type="submit"
            disabled={sending}
            className="h-9 w-full rounded-lg bg-ember font-semibold text-[#0A0A0A] shadow-none hover:bg-ember/90"
          >
            {sending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Sending link…
              </>
            ) : (
              "Send magic link"
            )}
          </Button>
        </form>

        {/* Inline error */}
        {error && (
          <p role="alert" className="mt-2 text-xs leading-snug text-red-400">
            {error}
          </p>
        )}

        {/* Outcome blocks */}
        {sentTo !== null && !error && magicUrl && (
          <div className="mt-3 rounded-lg border border-ember/25 bg-ember/[0.06] p-3">
            <p className="text-xs leading-snug text-white/80">
              Magic link sent to <span className="font-semibold text-white">{sentTo}</span>
            </p>
            <Button
              asChild
              className="mt-2 h-9 w-full rounded-lg bg-ember font-semibold text-[#0A0A0A] shadow-none hover:bg-ember/90"
            >
              <a
                href={magicUrl}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = magicUrl;
                }}
              >
                Open magic link ↗
              </a>
            </Button>
            <p className={cn(MONO_LABEL, "mt-2")}>Dev inbox — replaced by SMTP in prod</p>
          </div>
        )}

        {sentTo !== null && !error && !magicUrl && (
          <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <p className="text-xs leading-snug text-white/80">
              Check your inbox — the link expires in 15 min.
            </p>
            <button
              type="button"
              disabled={sending || resendIn > 0}
              onClick={() => void sendMagicLink(sentTo)}
              className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-ember transition-colors hover:text-ember-hot disabled:cursor-not-allowed disabled:text-white/30"
            >
              {sending && <Loader2 className="size-3 animate-spin" aria-hidden />}
              {sending ? "Resending…" : resendIn > 0 ? `Resend in ${resendIn}s` : "Resend"}
            </button>
          </div>
        )}

        {/* Saved works without an account — bookmarks ride the anon visitor key */}
        <div className="mt-4 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              useExplorer.getState().openSaved("mine");
            }}
            className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
          >
            <Bookmark className="size-3.5 shrink-0 text-ember" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-white/80">Saved items</span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                Works without an account →
              </span>
            </span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
