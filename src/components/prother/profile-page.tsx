"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, FolderHeart, Loader2, Pencil, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "./image-upload-field";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CollectionsMinePanel } from "./collections-mine-full-page";
import { SavedPanel } from "./saved-full-page";

const MONO = "font-mono text-xs uppercase tracking-[0.25em] text-white/60";

type ProfileTab = "collections" | "saved";

const TABS: { value: ProfileTab; label: string; icon: typeof Bookmark }[] = [
  { value: "collections", label: "My collections & follows", icon: FolderHeart },
  { value: "saved", label: "Saved", icon: Bookmark },
];

type Identity = {
  name: string;
  handle: string;
  email: string | null;
  bio: string;
  image: string | null;
  coverImage: string | null;
};

/** Ask the header AuthMenu to open its sign-in popover. */
function openAuth(): void {
  window.dispatchEvent(new CustomEvent("prother:auth-open"));
}

function SignInPrompt() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-2xl border border-ember/30 bg-ember/[0.06]"
      >
        <UserRound className="size-6 text-ember" />
      </span>
      <h1 className="text-2xl font-black tracking-tight text-white">SIGN IN REQUIRED</h1>
      <p className="max-w-sm text-sm leading-relaxed text-white/55">
        Your profile, collections, and follows live in your account. Sign in
        to pick up where you left off.
      </p>
      <Button
        type="button"
        onClick={openAuth}
        className="h-11 bg-ember px-6 font-mono text-sm font-black tracking-wider text-[#0A0A0A] hover:bg-ember-hot"
      >
        SIGN IN →
      </Button>
    </div>
  );
}

const BIO_MAX = 200;

type ProfilePayload = {
  id: string;
  name: string | null;
  handle: string | null;
  bio: string | null;
  image: string | null;
  coverImage: string | null;
  role: string;
  createdAt: string;
};

/**
 * Inline profile editor — full-width form section on the profile page
 * (replaces the cramped 340px editor popover, which clipped the banner
 * field on desktop and overflowed small screens). Mounts fresh per edit
 * session (keyed by the parent), so initial state needs no effects.
 */
function ProfileEditForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: Identity;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initial.name);
  const [handle, setHandle] = useState(initial.handle);
  const [bio, setBio] = useState(initial.bio);
  const [image, setImage] = useState<string | null>(initial.image);
  const [coverImage, setCoverImage] = useState<string | null>(initial.coverImage);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, handle, bio, image, coverImage }),
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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the profile."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-label="Edit profile"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6"
    >
      <p className={MONO}>Edit profile</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!saving) void save();
        }}
        noValidate
        className="mt-4 space-y-4"
      >
        <ImageUploadField
          value={coverImage}
          onChange={(url) => setCoverImage(url)}
          purpose="banner"
          endpoint="user"
          label="Banner"
          hint="Wide works best · remove returns to the glow"
          disabled={saving}
        />
        <div className="grid gap-4 sm:grid-cols-[auto_1fr_1fr]">
          <ImageUploadField
            value={image}
            onChange={(url) => setImage(url)}
            purpose="avatar"
            endpoint="user"
            square
            label="Avatar"
            hint="Square works best"
            className="w-[140px]"
            disabled={saving}
          />
          <div>
            <Label htmlFor="pf-name" className={MONO}>
              Name
            </Label>
            <Input
              id="pf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="name"
              disabled={saving}
              className="mt-1 h-11 rounded-lg border-white/15 bg-white/[0.03] text-sm text-white placeholder:text-white/55 focus-visible:border-ember/50 focus-visible:ring-ember/20"
              placeholder="Your name"
            />
          </div>
          <div>
            <Label htmlFor="pf-handle" className={MONO}>
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
                id="pf-handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/\s/g, ""))}
                maxLength={24}
                autoComplete="off"
                spellCheck={false}
                disabled={saving}
                className="h-11 rounded-lg border-white/15 bg-white/[0.03] pl-7 text-sm text-white placeholder:text-white/55 focus-visible:border-ember/50 focus-visible:ring-ember/20"
                placeholder="handle"
              />
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="pf-bio" className={MONO}>
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
            id="pf-bio"
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

        <div className="flex flex-wrap gap-2.5">
          <Button
            type="submit"
            disabled={saving}
            className="h-11 flex-1 rounded-lg bg-ember px-6 font-semibold text-[#0A0A0A] shadow-none hover:bg-ember/90 sm:flex-none sm:px-8"
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
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
            className="h-11 rounded-lg border-white/15 bg-transparent text-white/70 hover:border-ember/40 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}

export function ProfilePage() {
  const { status, data, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: ProfileTab =
    searchParams.get("tab") === "saved" ? "saved" : "collections";

  const [identity, setIdentity] = useState<Identity | null>(null);
  const [editing, setEditing] = useState(false);

  // Authoritative profile (bio + avatar live outside the session). Writes
  // happen in async continuations only (repo lint ban on setState-in-effect);
  // signed-out rendering keys off `status`, so no reset write is needed.
  useEffect(() => {
    if (status !== "authenticated") return;
    let alive = true;
    const user = data?.user;
    const fallback = user?.email?.split("@")[0] ?? "maker";
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        const p = d?.profile;
        setIdentity({
          name: p?.name || user?.name || user?.handle || fallback,
          handle: p?.handle || user?.handle || fallback,
          email: user?.email ?? null,
          bio: p?.bio ?? "",
          image: p?.image ?? user?.image ?? null,
          coverImage: p?.coverImage ?? null,
        });
      })
      .catch(() => {
        if (!alive) return;
        setIdentity({
          name: user?.name || user?.handle || fallback,
          handle: user?.handle || fallback,
          email: user?.email ?? null,
          bio: "",
          image: user?.image ?? null,
          coverImage: null,
        });
      });
    return () => {
      alive = false;
    };
  }, [status, data?.user]);

  const switchTab = (next: ProfileTab) => {
    router.replace(next === "collections" ? "/profile" : "/profile?tab=saved", {
      scroll: false,
    });
  };

  const refreshIdentity = async () => {
    await update();
    setIdentity(null);
    const user = data?.user;
    const fallback = user?.email?.split("@")[0] ?? "maker";
    try {
      const r = await fetch("/api/user/profile");
      const d = r.ok ? await r.json() : null;
      const p = d?.profile;
      setIdentity({
        name: p?.name || user?.name || user?.handle || fallback,
        handle: p?.handle || user?.handle || fallback,
        email: user?.email ?? null,
        bio: p?.bio ?? "",
        image: p?.image ?? user?.image ?? null,
        coverImage: p?.coverImage ?? null,
      });
    } catch {
      /* editor toast already confirmed the save; header refresh is best-effort */
    }
  };

  if (status === "loading") {
    return (
      <div className="space-y-3 pt-8" aria-label="Loading profile">
        <div className="h-36 animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="h-10 w-64 animate-pulse rounded-lg bg-white/[0.04]" />
        <div className="h-24 animate-pulse rounded-xl bg-white/[0.04]" />
      </div>
    );
  }

  // Guest on the Saved tab: anon list works without an account.
  if (status === "unauthenticated" && tab === "saved") {
    return (
      <div className="space-y-6 pt-8">
        <div className="flex flex-col gap-3 rounded-xl border border-ember/25 bg-ember/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-white/75">
            These saves live on this device only.{" "}
            <span className="text-white/90">Sign in to keep them with your account.</span>
          </p>
          <Button
            type="button"
            onClick={openAuth}
            className="h-10 shrink-0 bg-ember px-5 font-mono text-sm font-black tracking-wider text-[#0A0A0A] hover:bg-ember-hot"
          >
            SIGN IN →
          </Button>
        </div>
        <SavedPanel />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="pt-8">
        <SignInPrompt />
      </div>
    );
  }

  // Signed-out rendering never touches stale identity, even if a session
  // just ended without unmounting this page.
  const shown = status === "authenticated" ? identity : null;
  const letter = (shown?.name.trim()[0] || "P").toUpperCase();

  const startEditing = () => setEditing(true);
  const cancelEditing = () => setEditing(false);
  const finishEditing = async () => {
    await refreshIdentity();
    setEditing(false);
  };

  return (
    <div className="space-y-8 pt-8">
      {/* ── Header: banner + avatar + identity (per sketch) ── */}
      <section aria-label="Profile header">
        <div className="relative h-36 overflow-hidden rounded-2xl border border-white/10 bg-coal">
          {shown?.coverImage ? (
            <img
              src={shown.coverImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="absolute bottom-0 left-1/2 h-[180px] w-[420px] -translate-x-1/2 rounded-full bg-ember/15 blur-[80px]"
            />
          )}
        </div>
        <div className="relative z-10 -mt-10 flex flex-wrap items-end gap-4 px-4 sm:px-6">
          {shown?.image ? (
            <img
              src={shown.image}
              alt=""
              className="size-20 shrink-0 rounded-2xl border border-white/15 object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="grid size-20 shrink-0 place-items-center rounded-2xl border border-white/15 bg-ember/20 font-mono text-2xl font-bold text-ember"
            >
              {letter}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-3xl font-black tracking-tight text-white">
              {shown?.name ?? "…"}
            </h1>
            <p className="mt-1 truncate font-mono text-xs tracking-wider text-white/60 uppercase">
              @{shown?.handle ?? "…"}
              {shown?.email ? ` · ${shown.email}` : ""}
            </p>
            {shown?.bio && (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                {shown.bio}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={startEditing}
            className="shrink-0 border-white/15 bg-transparent text-white/70 hover:border-ember/40 hover:text-white"
          >
            <Pencil className="size-3.5" aria-hidden /> Edit profile
          </Button>
        </div>
      </section>

      {editing && shown && (
        <ProfileEditForm
          key={`${shown.handle}-${shown.email ?? ""}`}
          initial={shown}
          onSaved={() => void finishEditing()}
          onCancel={cancelEditing}
        />
      )}

      {/* ── Tabs ── */}
      <div
        role="tablist"
        aria-label="Profile sections"
        className="flex flex-wrap gap-1.5 border-b border-white/10 pb-4"
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => switchTab(t.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-sm uppercase tracking-wider transition-colors",
              tab === t.value
                ? "border-ember bg-ember/15 text-ember"
                : "border-white/10 bg-white/[0.03] text-white/55 hover:border-ember/40 hover:text-white"
            )}
          >
            <t.icon className="size-3.5" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "collections" ? (
          <CollectionsMinePanel active />
        ) : (
          <SavedPanel />
        )}
      </div>
    </div>
  );
}
