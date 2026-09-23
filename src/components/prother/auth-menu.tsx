"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Bookmark, FolderHeart, Loader2, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/prother/image-upload-field";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useExplorer } from "./explorer-store";

/**
 * Header sign-in / account widget (PRD F-37).
 *
 * Signed out  → "SIGN IN" mono button opening a popover with Google OAuth
 *               (only when configured) + the email magic-link flow
 *               (CSRF → POST /api/auth/signin/email → dev-inbox lookup).
 * Signed in   → avatar/@handle chip with a dropdown (profile editor, my
 *               collections, sign out). The profile editor is a controlled
 *               Popover anchored to the chip: selecting "Profile" closes the
 *               menu and opens the form, so the two Radix layers never nest.
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
const MONO_LABEL = "font-mono text-xs uppercase tracking-[0.25em] text-white/60";

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
  const { status, data, update } = useSession();

  // Popover open state — also driven by the "prother:auth-open" event.
  const [open, setOpen] = useState(false);

  // Profile editor popover (signed in) — anchored to the avatar chip; the
  // dropdown menu closes before it opens, so the layers never stack.
  const [profileOpen, setProfileOpen] = useState(false);
  // Radix restores focus to the trigger after the menu closes; that stray
  // focus event dismisses the freshly opened popover, so the close-restore
  // is suppressed when the Profile item opened it (flag consumed by
  // DropdownMenuContent.onCloseAutoFocus).
  const openProfileRef = useRef(false);
  const chipRef = useRef<HTMLButtonElement>(null);

  const handleProfileOpenChange = useCallback((next: boolean) => {
    setProfileOpen(next);
    if (!next) {
      // Return focus to the chip so keyboard users keep their place after
      // Escape / outside-click / the Save flow closes the editor.
      window.setTimeout(() => chipRef.current?.focus(), 0);
    }
  }, []);

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
      if (!csrfRes.ok) throw new Error("Could not start sign-in. Try again.");
      const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
      if (!csrfToken) throw new Error("Missing CSRF token. Try again.");

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
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
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
    const avatar = user.image;

    return (
      <Popover open={profileOpen} onOpenChange={handleProfileOpenChange}>
        <DropdownMenu>
          <PopoverAnchor asChild>
            <DropdownMenuTrigger asChild>
              <button
                ref={chipRef}
                type="button"
                aria-haspopup="menu"
                aria-label={`Account menu for @${handle}`}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-3 transition-colors hover:border-ember/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt=""
                    className="size-6 shrink-0 rounded-full border border-white/15 object-cover"
                  />
                ) : (
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ember/20 font-bold text-ember">
                    {letter}
                  </span>
                )}
                <span className="font-mono text-xs text-white/80">@{handle}</span>
              </button>
            </DropdownMenuTrigger>
          </PopoverAnchor>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            onCloseAutoFocus={(e) => {
              // The Profile item opens the editor popover: keep Radix from
              // restoring focus to the trigger (that dismisses the popover).
              if (openProfileRef.current) {
                openProfileRef.current = false;
                e.preventDefault();
              }
            }}
            className="z-[70] w-64 rounded-xl border border-white/10 bg-coal p-1 text-white shadow-xl shadow-black/40"
          >
            <DropdownMenuLabel className="px-2 py-2">
              <div className="flex items-center gap-2.5">
                {avatar ? (
                  <img
                    src={avatar}
                    alt=""
                    className="size-9 shrink-0 rounded-full border border-white/15 object-cover"
                  />
                ) : (
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ember/20 font-mono text-sm font-bold text-ember">
                    {letter}
                  </span>
                )}
                <div className="min-w-0">
                  <span className="block truncate font-mono text-xs font-semibold uppercase tracking-[0.15em] text-white">
                    {name}
                  </span>
                  <span className="block truncate font-mono text-xs text-white/60">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />

            <DropdownMenuItem
              onSelect={() => {
                openProfileRef.current = true;
                // Open after the menu finishes its close cycle; Radix treats
                // the same-tick open as a dismiss and cancels it otherwise.
                window.setTimeout(() => setProfileOpen(true), 0);
              }}
              className="gap-2 rounded-lg px-2 py-2 text-sm text-white/80 focus:bg-white/10 focus:text-white"
            >
              <UserRound className="size-4 text-ember" aria-hidden />
              Profile
            </DropdownMenuItem>

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

        <ProfileEditor
          open={profileOpen}
          onOpenChange={handleProfileOpenChange}
          initial={{ name, handle, email: user.email ?? null }}
          onSaved={async () => {
            // Refetch the session so the chip avatar + @handle update without
            // a page reload (database sessions re-run the session callback).
            await update();
          }}
        />
      </Popover>
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
          className="inline-flex h-9 items-center rounded-lg border border-white/15 bg-transparent px-3.5 font-mono text-sm uppercase tracking-[0.25em] text-ember transition-colors hover:border-ember/50 hover:bg-ember/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
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
            className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2.5 rounded-lg border border-white/15 bg-white/[0.03] font-mono text-sm uppercase tracking-[0.25em] text-white/80 transition-colors hover:border-ember/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
          >
            <GoogleGlyph />
            Continue with Google
          </button>
        ) : (
          <div
            aria-disabled="true"
            className="mt-4 flex min-h-9 items-center justify-center rounded-lg border border-white/10 px-2 py-2 text-center font-mono text-xs uppercase leading-relaxed tracking-[0.2em] text-white/55 opacity-50"
          >
            Google: configure GOOGLE_CLIENT_ID to enable
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
            className="h-9 rounded-lg border-white/15 bg-white/[0.03] text-sm text-white placeholder:text-white/55 focus-visible:border-ember/50 focus-visible:ring-ember/20"
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
            <p className={cn(MONO_LABEL, "mt-2")}>Dev inbox (replaced by SMTP in prod)</p>
          </div>
        )}

        {sentTo !== null && !error && !magicUrl && (
          <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <p className="text-xs leading-snug text-white/80">
              Check your inbox. The link expires in 15 min.
            </p>
            <button
              type="button"
              disabled={sending || resendIn > 0}
              onClick={() => void sendMagicLink(sentTo)}
              className="mt-2 inline-flex items-center gap-1.5 font-mono text-sm uppercase tracking-[0.25em] text-ember transition-colors hover:text-ember-hot disabled:cursor-not-allowed disabled:text-white/40"
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
              <span className="block font-mono text-xs uppercase tracking-[0.2em] text-white/55">
                Works without an account →
              </span>
            </span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Profile editor (Task 34) ────────────────────────────────────────────────

/** GET/PATCH /api/user/profile payload (route returns this shape). */
type ProfilePayload = {
  id: string;
  name: string | null;
  handle: string | null;
  bio: string | null;
  image: string | null;
  role: string;
  createdAt: string;
};

const BIO_MAX = 200;

/**
 * Compact profile editor in a Popover anchored to the avatar chip.
 * Opening (the parent owns `open`) pulls the full profile so bio and avatar
 * are always current (fetch continuation, not an effect body, per the
 * repo's setState-in-effect lint ban); Save → PATCH, then onSaved() lets the
 * parent refresh the session so the header chip and the dropdown row pick up
 * the new avatar/handle without a reload.
 */
function ProfileEditor({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: { name: string; handle: string; email: string | null };
  onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initial.name);
  const [handle, setHandle] = useState(initial.handle);
  const [bio, setBio] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Every open: pull the authoritative profile (bio and avatar are not on
  // the session) and clear stale errors. All state writes happen in async
  // continuations so react-hooks/set-state-in-effect stays satisfied.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setError(null);
    fetch("/api/user/profile")
      .then((r) =>
        r.ok ? (r.json() as Promise<{ profile: ProfilePayload }>) : null
      )
      .then((d) => {
        if (!alive || !d?.profile) return;
        setName(d.profile.name || initial.name);
        setHandle(d.profile.handle || initial.handle);
        setBio(d.profile.bio ?? "");
        setImage(d.profile.image ?? null);
      })
      .catch(() => {
        /* fall back to the session-derived values already in the form */
      });
    return () => {
      alive = false;
    };
  }, [open, initial.name, initial.handle]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, handle, bio, image }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { profile?: ProfilePayload; error?: string }
        | null;
      if (!res.ok || !payload?.profile) {
        throw new Error(
          payload?.error ?? "Could not save the profile. Try again."
        );
      }
      toast({ title: "Profile saved." });
      await onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the profile."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <PopoverContent
      align="end"
      sideOffset={8}
      className="z-[70] w-[340px] rounded-xl border border-white/10 bg-coal p-4 text-white shadow-xl shadow-black/40"
    >
      <p className={MONO_LABEL}>Profile</p>
      <p className="mt-1 text-xs leading-snug text-white/60">
        Signed in as {initial.email ?? "a maker"}.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!saving) void save();
        }}
        noValidate
        className="mt-4 space-y-3"
      >
        <div className="flex items-start gap-3">
          <ImageUploadField
            value={image}
            onChange={(url) => setImage(url)}
            purpose="avatar"
            endpoint="user"
            square
            label="Avatar"
            hint="Square works best"
            className="w-[116px] shrink-0"
            disabled={saving}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <Label htmlFor="prother-profile-name" className={MONO_LABEL}>
                Name
              </Label>
              <Input
                id="prother-profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoComplete="name"
                disabled={saving}
                className="mt-1 h-10 rounded-lg border-white/15 bg-white/[0.03] text-sm text-white placeholder:text-white/55 focus-visible:border-ember/50 focus-visible:ring-ember/20"
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="prother-profile-handle" className={MONO_LABEL}>
                Handle
              </Label>
              <div className="relative mt-1">
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-white/55"
                >
                  @
                </span>
                <Input
                  id="prother-profile-handle"
                  value={handle}
                  onChange={(e) =>
                    setHandle(e.target.value.replace(/\s/g, ""))
                  }
                  maxLength={24}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={saving}
                  className="h-10 rounded-lg border-white/15 bg-white/[0.03] pl-7 text-sm text-white placeholder:text-white/55 focus-visible:border-ember/50 focus-visible:ring-ember/20"
                  placeholder="handle"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="prother-profile-bio" className={MONO_LABEL}>
              Bio
            </Label>
            <span
              className={cn(
                "font-mono text-xs tabular-nums",
                bio.length >= BIO_MAX ? "text-ember" : "text-white/55"
              )}
            >
              {bio.length}/{BIO_MAX}
            </span>
          </div>
          <Textarea
            id="prother-profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
            maxLength={BIO_MAX}
            rows={3}
            disabled={saving}
            className="mt-1 rounded-lg border-white/15 bg-white/[0.03] text-sm text-white placeholder:text-white/55 focus-visible:border-ember/50 focus-visible:ring-ember/20"
            placeholder="What are you building?"
          />
        </div>

        {error && (
          <p role="alert" className="text-xs leading-snug text-red-400">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={saving}
          className="h-11 w-full rounded-lg bg-ember font-semibold text-[#0A0A0A] shadow-none hover:bg-ember/90"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            "Save profile"
          )}
        </Button>
      </form>
    </PopoverContent>
  );
}
