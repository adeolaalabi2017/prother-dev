"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { FolderHeart, Heart, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { FullPageShell, PageSkeleton } from "./page-shell";
import { useExplorer } from "./explorer-store";

/**
 * My collections + follows full page (?mine=collections). Auth-gated:
 * session loading → skeleton, anon → sign-in panel, else two tabs backed
 * by /api/collections and /api/follows.
 */

type MineCollection = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  itemCount: number;
  covers: string[];
};

type FollowRow = {
  id: string;
  targetType: "tool" | "category" | "maker";
  targetId: string;
  targetLabel: string;
  createdAt: string;
};

const MONO = "font-mono text-[10px] uppercase tracking-[0.25em] text-white/40";
const PANEL = "rounded-xl border border-white/10 bg-white/[0.02]";

/** Re-open the auth modal (wired by the site header). */
function openAuth(): void {
  window.dispatchEvent(new CustomEvent("prother:auth-open"));
}

export function CollectionsMineFullPage() {
  const { toast } = useToast();
  const { status } = useSession();
  const mineView = useExplorer((s) => s.mineView);
  const closeMine = useExplorer((s) => s.closeMine);
  const openCollection = useExplorer((s) => s.openCollection);

  const [colls, setColls] = useState<MineCollection[] | null>(null);
  const [collsLoading, setCollsLoading] = useState(true);
  const [follows, setFollows] = useState<FollowRow[] | null>(null);
  const [followsLoading, setFollowsLoading] = useState(false);
  const [tab, setTab] = useState("collections");

  // Create form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPublic, setNewPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  // Mutation bookkeeping
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const confirmTimer = useRef<number | null>(null);
  const [unfollowing, setUnfollowing] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    setCollsLoading(true);
    try {
      const res = await fetch("/api/collections");
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { mine: MineCollection[] };
      setColls(data.mine ?? []);
    } catch {
      setColls([]);
      toast({ title: "Couldn't load your collections", variant: "destructive" });
    } finally {
      setCollsLoading(false);
    }
  }, [toast]);

  const loadFollows = useCallback(async () => {
    setFollowsLoading(true);
    try {
      const res = await fetch("/api/follows");
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { follows: FollowRow[] };
      setFollows(data.follows ?? []);
    } catch {
      setFollows([]);
      toast({ title: "Couldn't load your follows", variant: "destructive" });
    } finally {
      setFollowsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (status !== "authenticated" || mineView !== "collections") return;
    if (colls === null) void loadCollections();
  }, [status, mineView, colls, loadCollections]);

  useEffect(() => {
    if (status !== "authenticated" || mineView !== "collections") return;
    if (tab === "following" && follows === null && !followsLoading) {
      void loadFollows();
    }
  }, [status, mineView, tab, follows, followsLoading, loadFollows]);

  const create = useCallback(async () => {
    const name = newName.trim();
    if (name.length < 2 || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: newDesc.trim() || undefined,
          isPublic: newPublic,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { collection?: MineCollection };
      if (!res.ok || !data.collection) {
        toast({ title: "Could not create the collection", variant: "destructive" });
        return;
      }
      setColls((prev) => [data.collection!, ...(prev ?? [])]);
      setNewName("");
      setNewDesc("");
      setNewPublic(true);
      toast({ title: `Collection "${data.collection.name}" created` });
    } catch {
      toast({ title: "Could not create the collection", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }, [newName, newDesc, newPublic, creating, toast]);

  const togglePublic = useCallback(
    async (c: MineCollection) => {
      const next = !c.isPublic;
      setColls((prev) =>
        (prev ?? []).map((x) => (x.slug === c.slug ? { ...x, isPublic: next } : x))
      );
      try {
        const res = await fetch(`/api/collections/${encodeURIComponent(c.slug)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublic: next }),
        });
        if (!res.ok) throw new Error("failed");
        toast({ title: next ? "Collection is now public" : "Collection is now private" });
      } catch {
        setColls((prev) =>
          (prev ?? []).map((x) => (x.slug === c.slug ? { ...x, isPublic: !next } : x))
        );
        toast({ title: "Could not update visibility", variant: "destructive" });
      }
    },
    [toast]
  );

  const remove = useCallback(
    async (c: MineCollection) => {
      setBusySlug(c.slug);
      try {
        const res = await fetch(`/api/collections/${encodeURIComponent(c.slug)}`, {
          method: "DELETE",
        });
        if (!res.ok && res.status !== 404) throw new Error("failed");
        setColls((prev) => (prev ?? []).filter((x) => x.slug !== c.slug));
        toast({ title: `Deleted "${c.name}"` });
      } catch {
        toast({ title: "Could not delete the collection", variant: "destructive" });
      } finally {
        setBusySlug(null);
        setConfirmDelete(null);
      }
    },
    [toast]
  );

  const armDelete = useCallback((slug: string) => {
    setConfirmDelete(slug);
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirmDelete(null), 3000);
  }, []);

  const unfollow = useCallback(
    async (f: FollowRow) => {
      setUnfollowing(f.id);
      try {
        const res = await fetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType: f.targetType,
            targetId: f.targetId,
            targetLabel: f.targetLabel,
          }),
        });
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { following?: boolean };
        if (!data.following) {
          setFollows((prev) => (prev ?? []).filter((x) => x.id !== f.id));
          toast({ title: "Unfollowed" });
        }
      } catch {
        toast({ title: "Could not unfollow", variant: "destructive" });
      } finally {
        setUnfollowing(null);
      }
    },
    [toast]
  );

  const groupedFollows = useMemo(() => {
    const groups: { type: FollowRow["targetType"]; rows: FollowRow[] }[] = [
      { type: "tool", rows: [] },
      { type: "category", rows: [] },
      { type: "maker", rows: [] },
    ];
    for (const f of follows ?? []) {
      const g = groups.find((x) => x.type === f.targetType);
      if (g) g.rows.push(f);
    }
    return groups.filter((g) => g.rows.length > 0);
  }, [follows]);

  // ── Gate: mount state ──
  if (mineView !== "collections") return null;

  // Session loading → skeleton.
  if (status === "loading") {
    return (
      <FullPageShell
        kicker="Account"
        breadcrumb={[{ label: "Home" }]}
        onClose={closeMine}
        ariaLabel="My collections"
      >
        <PageSkeleton />
      </FullPageShell>
    );
  }

  // Anonymous → sign-in panel.
  if (status === "unauthenticated") {
    return (
      <FullPageShell
        kicker="Account"
        breadcrumb={[{ label: "Home" }]}
        onClose={closeMine}
        ariaLabel="My collections — sign in required"
      >
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span
            aria-hidden
            className="grid size-14 place-items-center rounded-2xl border border-ember/30 bg-ember/[0.06]"
          >
            <FolderHeart className="size-6 text-ember" />
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white">SIGN IN REQUIRED</h1>
          <p className="max-w-sm text-sm leading-relaxed text-white/55">
            Collections and follows live in your account — sign in to keep your
            picks across visits.
          </p>
          <Button
            type="button"
            onClick={openAuth}
            className="h-11 bg-ember px-6 font-mono text-xs font-black tracking-wider text-[#0A0A0A] hover:bg-ember-hot"
          >
            SIGN IN →
          </Button>
        </div>
      </FullPageShell>
    );
  }

  return (
    <FullPageShell
      kicker="Account"
      breadcrumb={[{ label: "Home" }, { label: "My collections" }]}
      onClose={closeMine}
      ariaLabel="My collections and follows"
    >
      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList className="h-11 w-fit border border-white/10 bg-white/[0.03] p-1">
          <TabsTrigger
            value="collections"
            className="h-9 rounded-lg px-4 font-mono text-[11px] tracking-wider text-white/60 data-[state=active]:bg-ember data-[state=active]:text-[#0A0A0A]"
          >
            MY COLLECTIONS
          </TabsTrigger>
          <TabsTrigger
            value="following"
            className="h-9 rounded-lg px-4 font-mono text-[11px] tracking-wider text-white/60 data-[state=active]:bg-ember data-[state=active]:text-[#0A0A0A]"
          >
            FOLLOWING
          </TabsTrigger>
        </TabsList>

        {/* ── Collections tab ── */}
        <TabsContent value="collections" className="space-y-6">
          {/* Create panel */}
          <section aria-label="Create a collection" className={cn(PANEL, "space-y-3 p-4")}>
            <h2 className={MONO}>New collection</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="coll-name" className="sr-only">
                  Collection name
                </label>
                <Input
                  id="coll-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.slice(0, 48))}
                  placeholder="Name — e.g. Agent stacks"
                  className="h-11 border-white/10 bg-transparent text-sm focus-visible:border-ember/50 focus-visible:ring-0"
                />
              </div>
              <div>
                <label htmlFor="coll-desc" className="sr-only">
                  Description (optional)
                </label>
                <Input
                  id="coll-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value.slice(0, 120))}
                  placeholder="Description (optional)"
                  className="h-11 border-white/10 bg-transparent text-sm focus-visible:border-ember/50 focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label
                htmlFor="coll-public"
                className="flex cursor-pointer items-center gap-2.5"
              >
                <Switch
                  id="coll-public"
                  checked={newPublic}
                  onCheckedChange={setNewPublic}
                  aria-label="Make this collection public"
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                  {newPublic ? "Public" : "Private"}
                </span>
              </label>
              <Button
                type="button"
                onClick={() => void create()}
                disabled={newName.trim().length < 2 || creating}
                className="h-10 bg-ember px-5 font-mono text-xs font-black tracking-wider text-[#0A0A0A] hover:bg-ember-hot"
              >
                {creating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden /> CREATING…
                  </>
                ) : (
                  <>
                    <Plus className="size-4" aria-hidden /> CREATE
                  </>
                )}
              </Button>
            </div>
          </section>

          {/* Cards */}
          {collsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className={cn(PANEL, "h-40 animate-pulse bg-white/[0.04]")} />
              ))}
            </div>
          ) : (colls?.length ?? 0) === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">
              No collections yet — create your first one above, or hit the
              bookmark on any tool.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="My collections">
              {colls!.map((c) => (
                <li key={c.id} className={cn(PANEL, "flex flex-col p-4")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-white/90">{c.name}</h3>
                      {c.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-white/45">{c.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 -space-x-1.5" aria-hidden>
                      {c.covers.slice(0, 4).map((emoji, i) => (
                        <span
                          key={i}
                          className="grid size-7 place-items-center rounded-md border border-white/10 bg-black/40 text-xs"
                        >
                          {emoji}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className={cn(MONO, "mt-3 flex items-center gap-1.5")}>
                    {c.itemCount} tool{c.itemCount === 1 ? "" : "s"} ·{" "}
                    {c.isPublic ? (
                      "Public"
                    ) : (
                      <>
                        <Lock className="size-3" aria-hidden /> Private
                      </>
                    )}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openCollection(c.slug)}
                      aria-label={`Open collection ${c.name}`}
                      className="h-9 bg-ember px-3.5 font-mono text-[11px] font-black tracking-wider text-[#0A0A0A] hover:bg-ember-hot"
                    >
                      OPEN →
                    </Button>
                    <div className="flex items-center gap-2.5">
                      <Switch
                        checked={c.isPublic}
                        onCheckedChange={() => void togglePublic(c)}
                        aria-label={`Make ${c.name} ${c.isPublic ? "private" : "public"}`}
                        disabled={busySlug === c.slug}
                      />
                      {confirmDelete === c.slug ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void remove(c)}
                          aria-label={`Confirm deleting ${c.name}`}
                          className="h-9 border-red-500/40 px-2.5 font-mono text-[10px] text-red-400 hover:bg-red-500/10"
                        >
                          SURE?
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => armDelete(c.slug)}
                          aria-label={`Delete ${c.name}`}
                          className="size-9 text-white/40 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ── Following tab ── */}
        <TabsContent value="following" className="space-y-6">
          {followsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className={cn(PANEL, "h-14 animate-pulse bg-white/[0.04]")} />
              ))}
            </div>
          ) : groupedFollows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 p-10 text-center">
              <Heart className="size-5 text-white/30" aria-hidden />
              <p className="text-sm text-white/70">You&apos;re not following anything yet.</p>
              <p className="max-w-sm text-xs leading-relaxed text-white/40">
                Follow tools, categories, and makers from their pages — new
                listings land here.
              </p>
            </div>
          ) : (
            groupedFollows.map((g) => (
              <section key={g.type} aria-label={`Followed ${g.type}s`} className="space-y-2">
                <h2 className={MONO}>
                  {g.type === "tool" ? "Tools" : g.type === "category" ? "Categories" : "Makers"} (
                  {g.rows.length})
                </h2>
                <ul className={cn(PANEL, "divide-y divide-white/[0.06]")}>
                  {g.rows.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 p-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white/85">{f.targetLabel}</p>
                        <p className="truncate font-mono text-[10px] text-white/35">{f.targetId}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void unfollow(f)}
                        disabled={unfollowing === f.id}
                        aria-label={`Unfollow ${f.targetLabel}`}
                        className="bg-white/[0.03] hover:bg-white/[0.08] h-9 shrink-0 border-white/10 px-3 font-mono text-[10px] tracking-wider text-white/60 hover:border-ember/40 hover:text-ember"
                      >
                        {unfollowing === f.id ? (
                          <>
                            <Loader2 className="size-3 animate-spin" aria-hidden /> …
                          </>
                        ) : (
                          "UNFOLLOW"
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </TabsContent>
      </Tabs>
    </FullPageShell>
  );
}
