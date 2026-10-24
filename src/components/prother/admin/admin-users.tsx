"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Eye, ImagePlus, Loader2, Search, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ImageUploadField } from "@/components/prother/image-upload-field";
import { adminFetch, inputCx, LoadError, MiniStat } from "./admin-shared";

/**
 * Admin — Users module (Task 23-b).
 * Community roster: search + status/role filters, role changes and
 * ban/unban with optimistic row updates (revert + toast on error).
 * PATCH /api/admin/users/[id] — banning also revokes sessions server-side.
 */

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  handle: string;
  image: string | null;
  role: "member" | "moderator" | "admin";
  status: "active" | "banned";
  createdAt: string;
  threads: number;
  replies: number;
  reviews: number;
  bookmarks: number;
  reportsFiled: number;
  lastActivityAt: string | null;
};

type UsersStats = { total: number; banned: number; moderators: number; admins: number };

type UsersPage = {
  users: AdminUser[];
  stats: UsersStats;
  page: number;
  size: number;
  total: number;
  hasMore: boolean;
};

type UserDetail = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    handle: string | null;
    image: string | null;
    role: string;
    status: string;
    createdAt: string;
    lastActivityAt: string | null;
  };
  counts: { threads: number; replies: number; reviews: number; reports: number };
  threads: {
    id: string;
    href: string;
    title: string;
    topic: string;
    hidden: boolean;
    replyCount: number;
    createdAt: string;
  }[];
  replies: {
    id: string;
    href: string;
    threadTitle: string;
    excerpt: string;
    hidden: boolean;
    createdAt: string;
  }[];
  reviews: {
    id: string;
    href: string;
    toolName: string;
    status: string;
    ease: number;
    power: number;
    value: number;
    excerpt: string;
    createdAt: string;
  }[];
  reports: {
    id: string;
    targetType: string;
    targetLabel: string;
    reason: string;
    status: string;
    createdAt: string;
  }[];
  audit: { id: string; action: string; meta: string; createdAt: string }[];
};

/** Detail drawer: one user's content, moderation state, and audit trail. */
function UserDrawer({
  apiKey,
  userId,
  onClose,
}: {
  apiKey: string;
  userId: string;
  onClose: () => void;
}) {
  const [d, setD] = useState<UserDetail | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    adminFetch(apiKey, `/api/admin/users/${userId}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<UserDetail>;
      })
      .then((data) => setD(data))
      .catch(() => setError(true));
  }, [apiKey, userId]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const itemCx =
    "rounded-lg border border-white/10 bg-white/[0.02] p-2.5 text-sm";
  const sectionTitleCx =
    "font-mono text-xs tracking-[0.25em] text-white/55 uppercase";

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-md overflow-y-auto border-white/10 bg-ink p-5 text-white sm:max-w-md"
      >
        <SheetHeader className="p-0">
          <SheetTitle className="flex items-center gap-3 text-left text-lg">
            <span className="font-mono text-ember">
              {atHandle(d?.user.handle ?? "...")}
            </span>
            {d?.user.status === "banned" && (
              <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 font-mono text-xs uppercase text-red-300">
                Banned
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {d?.user.name ?? "User"} details and moderation history.
          </SheetDescription>
        </SheetHeader>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-400/25 bg-red-400/[0.04] p-6 text-center">
            <p className="font-mono text-xs tracking-[0.25em] text-red-300 uppercase">
              Detail unavailable
            </p>
            <p className="mt-2 text-sm text-white/60">
              Couldn't load this user. Check the admin key or network.
            </p>
            <Button size="sm" onClick={load} className="mt-4 rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal">
              <Loader2 className="size-3.5" aria-hidden />
              Retry
            </Button>
          </div>
        ) : !d ? (
          <UsersSkeleton />
        ) : (
          <div className="mt-4 space-y-5">
            <div className="space-y-1 text-sm">
              <p className="text-white/80">{d.user.name ?? "(no name)"}</p>
              <p className="font-mono text-xs text-white/60">{d.user.email}</p>
              <p className="font-mono text-xs text-white/45">
                role {d.user.role} · joined{" "}
                {new Date(d.user.createdAt).toISOString().slice(0, 10)} · last
                active {relTime(d.user.lastActivityAt)}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <MiniStat label="Threads" value={d.counts.threads} />
              <MiniStat label="Replies" value={d.counts.replies} />
              <MiniStat label="Reviews" value={d.counts.reviews} />
              <MiniStat label="Reports" value={d.counts.reports} />
            </div>

            {d.audit.length > 0 && (
              <section className="space-y-2">
                <p className={sectionTitleCx}>Moderation history</p>
                {d.audit.map((a) => (
                  <div key={a.id} className={itemCx}>
                    <p className="font-mono text-xs text-white/75">
                      {a.action} · {relTime(a.createdAt)}
                    </p>
                    {a.meta && (
                      <p className="mt-1 text-xs text-white/55">{a.meta}</p>
                    )}
                  </div>
                ))}
              </section>
            )}

            <section className="space-y-2">
              <p className={sectionTitleCx}>Threads</p>
              {d.threads.length === 0 ? (
                <p className="text-xs text-white/45">None.</p>
              ) : (
                d.threads.map((t) => (
                  <div key={t.id} className={itemCx}>
                    <div className="flex items-center justify-between gap-2">
                      {t.href ? (
                        <a
                          href={t.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 truncate text-white/85 underline decoration-white/20 underline-offset-2 hover:text-ember"
                        >
                          {t.title}
                        </a>
                      ) : (
                        <span className="min-w-0 truncate text-white/85">{t.title}</span>
                      )}
                      {t.hidden && (
                        <span className="shrink-0 rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 font-mono text-[10px] uppercase text-red-300">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-xs text-white/45">
                      {t.topic} · {t.replyCount} replies · {relTime(t.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </section>

            <section className="space-y-2">
              <p className={sectionTitleCx}>Replies</p>
              {d.replies.length === 0 ? (
                <p className="text-xs text-white/45">None.</p>
              ) : (
                d.replies.map((r) => (
                  <div key={r.id} className={itemCx}>
                    <div className="flex items-center justify-between gap-2">
                      {r.href ? (
                        <a
                          href={r.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 truncate text-xs text-white/60 underline decoration-white/20 underline-offset-2 hover:text-ember"
                        >
                          {r.threadTitle || "(thread)"}
                        </a>
                      ) : (
                        <span className="min-w-0 truncate text-xs text-white/60">
                          {r.threadTitle || "(thread)"}
                        </span>
                      )}
                      {r.hidden && (
                        <span className="shrink-0 rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 font-mono text-[10px] uppercase text-red-300">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/75">
                      {r.excerpt}
                    </p>
                    <p className="mt-1 font-mono text-xs text-white/45">
                      {relTime(r.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </section>

            <section className="space-y-2">
              <p className={sectionTitleCx}>Reviews</p>
              {d.reviews.length === 0 ? (
                <p className="text-xs text-white/45">None.</p>
              ) : (
                d.reviews.map((r) => (
                  <div key={r.id} className={itemCx}>
                    <div className="flex items-center justify-between gap-2">
                      {r.href ? (
                        <a
                          href={r.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 truncate text-white/85 underline decoration-white/20 underline-offset-2 hover:text-ember"
                        >
                          {r.toolName}
                        </a>
                      ) : (
                        <span className="min-w-0 truncate text-white/85">{r.toolName}</span>
                      )}
                      {r.status === "filtered" && (
                        <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] uppercase text-amber-300">
                          Filtered
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-xs text-white/45">
                      ease {r.ease} · power {r.power} · value {r.value} ·{" "}
                      {relTime(r.createdAt)}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-white/75">
                      {r.excerpt}
                    </p>
                  </div>
                ))
              )}
            </section>

            <section className="space-y-2">
              <p className={sectionTitleCx}>Reports filed</p>
              {d.reports.length === 0 ? (
                <p className="text-xs text-white/45">None.</p>
              ) : (
                d.reports.map((r) => (
                  <div key={r.id} className={itemCx}>
                    <p className="text-xs text-white/80">
                      {r.targetType} · {r.reason} ·{" "}
                      <span className="font-mono uppercase text-white/55">
                        {r.status}
                      </span>
                    </p>
                    <p className="mt-1 truncate text-xs text-white/55">
                      {r.targetLabel}
                    </p>
                    <p className="mt-1 font-mono text-xs text-white/45">
                      {relTime(r.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </section>

            <p className="font-mono text-xs leading-relaxed text-white/45">
              NEWEST 50 ITEMS PER SECTION · TOTALS IN THE COUNT STRIP ·
              MODERATION HISTORY FROM THE AUDIT TRAIL
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

const STATUS_FILTERS = ["all", "active", "banned"] as const;
const ROLE_FILTERS = ["all", "member", "moderator", "admin"] as const;
const ROLE_VALUES = ["member", "moderator", "admin"] as const;

const ROLE_BADGE_CX: Record<AdminUser["role"], string> = {
  member: "border-white/10 bg-white/5 text-white/50",
  moderator: "border-white/20 bg-white/10 text-white/80",
  admin: "border-ember/40 bg-ember/10 text-ember",
};

function atHandle(handle: string) {
  return handle.startsWith("@") ? handle : `@${handle}`;
}

/** "3h" / "2d" / "just now" — relative last-active stamp for triage. */
function relTime(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 90_000) return "just now";
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type UserSort = "newest" | "activity" | "content";

const SORT_VALUES: { value: UserSort; label: string }[] = [
  { value: "newest", label: "Newest accounts" },
  { value: "activity", label: "Recently active" },
  { value: "content", label: "Most content" },
];

function UsersSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className="h-[70px] rounded-xl bg-white/[0.04]" />
      ))}
    </div>
  );
}

export function UsersTab({ apiKey, onChanged }: { apiKey: string; onChanged: () => void }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [stats, setStats] = useState<UsersStats | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [avatarOpen, setAvatarOpen] = useState<string | null>(null);
  const [sort, setSort] = useState<UserSort>("newest");
  const [banning, setBanning] = useState<string | null>(null);
  const [banNote, setBanNote] = useState("");
  const [inspect, setInspect] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [banSweep, setBanSweep] = useState(true);

  const load = useCallback(
    (page: number, append: boolean) => {
      adminFetch(
        apiKey,
        `/api/admin/users?q=${encodeURIComponent(q)}&status=${status}&role=${role}&page=${page}&size=50`
      )
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json() as Promise<UsersPage>;
        })
        .then((d) => {
          setUsers((cur) =>
            append && cur ? [...cur, ...d.users] : d.users
          );
          setStats(d.stats);
          setHasMore(d.hasMore);
          setError(false);
        })
        .catch(() => {
          if (!append) setError(true);
        });
    },
    [apiKey, q, status, role]
  );

  // Debounced search (~250ms) — mirrors the ListingsTab pattern.
  useEffect(() => {
    const t = setTimeout(() => load(0, false), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const retry = useCallback(() => {
    setUsers(null);
    setError(false);
    load(0, false);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!users || loadingMore) return;
    setLoadingMore(true);
    // Next page keyed off the loaded count (50/page, server-bounded).
    load(Math.floor(users.length / 50), true);
    setLoadingMore(false);
  }, [users, loadingMore, load]);

  const sendPatch = useCallback(
    async (
      id: string,
      body: {
        role?: string;
        status?: string;
        note?: string;
        hideContent?: boolean;
        restoreContent?: boolean;
      }
    ) => {
      setBusy(id);
      try {
        const res = await adminFetch(apiKey, `/api/admin/users/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        const d = (await res.json()) as {
          ok?: boolean;
          error?: string;
          sweep?: { threads: number; replies: number; reviews: number };
        };
        if (!res.ok || !d.ok) return { ok: false as const, error: d.error ?? "Update failed" };
        return { ok: true as const, sweep: d.sweep };
      } catch {
        return { ok: false as const, error: "Network error" };
      } finally {
        setBusy(null);
      }
    },
    [apiKey]
  );

  const setAvatar = useCallback(
    async (u: AdminUser, image: string | null) => {
      setBusy(u.id);
      try {
        const res = await adminFetch(apiKey, `/api/admin/users/${u.id}`, {
          method: "PATCH",
          body: JSON.stringify({ image }),
        });
        const d = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !d.ok) {
          toast({ title: d.error ?? "Avatar update failed", variant: "destructive" });
          return;
        }
        // Local state update: the roster payload already carries `image`.
        setUsers((cur) =>
          cur?.map((x) => (x.id === u.id ? { ...x, image } : x)) ?? cur
        );
        toast({
          title: image ? "Avatar updated" : "Avatar cleared",
          description: atHandle(u.handle),
        });
      } catch {
        toast({ title: "Network error", variant: "destructive" });
      } finally {
        setBusy(null);
      }
    },
    [apiKey, toast]
  );

  const toggleBan = useCallback(
    async (u: AdminUser, note: string, sweep: boolean) => {
      if (!users) return;
      const nextStatus: AdminUser["status"] = u.status === "active" ? "banned" : "active";
      const usersSnapshot = users;
      const statsSnapshot = stats;
      // optimistic row + banned counter, revert both on failure
      setUsers((cur) =>
        cur?.map((x) => (x.id === u.id ? { ...x, status: nextStatus } : x)) ?? cur
      );
      setStats((s) =>
        s
          ? { ...s, banned: Math.max(0, s.banned + (nextStatus === "banned" ? 1 : -1)) }
          : s
      );
      const res = await sendPatch(u.id, {
        status: nextStatus,
        note: note || undefined,
        ...(nextStatus === "banned" && sweep ? { hideContent: true } : {}),
        ...(nextStatus === "active" && sweep ? { restoreContent: true } : {}),
      });
      if (!res.ok) {
        setUsers(usersSnapshot);
        setStats(statsSnapshot);
        toast({ title: res.error, variant: "destructive" });
        return;
      }
      const sweepCounts = res.sweep
        ? ` (${res.sweep.threads} threads, ${res.sweep.replies} replies, ${res.sweep.reviews} reviews ${
            nextStatus === "banned" ? "hidden" : "restored"
          })`
        : nextStatus === "banned"
          ? "Sessions revoked. Sign-ins dead."
          : "Account is active again.";
      toast({
        title: nextStatus === "banned" ? `${atHandle(u.handle)} banned` : `${atHandle(u.handle)} reinstated`,
        description: sweepCounts,
      });
      onChanged();
    },
    [users, stats, sendPatch, toast, onChanged]
  );

  const changeRole = useCallback(
    async (u: AdminUser, nextRole: string) => {
      if (!users || nextRole === u.role) return;
      const usersSnapshot = users;
      const statsSnapshot = stats;
      setUsers((cur) =>
        cur?.map((x) => (x.id === u.id ? { ...x, role: nextRole as AdminUser["role"] } : x)) ?? cur
      );
      setStats((s) => {
        if (!s) return s;
        const moderators =
          s.moderators + (u.role === "moderator" ? -1 : 0) + (nextRole === "moderator" ? 1 : 0);
        const admins =
          s.admins + (u.role === "admin" ? -1 : 0) + (nextRole === "admin" ? 1 : 0);
        return { ...s, moderators, admins };
      });
      const res = await sendPatch(u.id, { role: nextRole });
      if (!res.ok) {
        setUsers(usersSnapshot);
        setStats(statsSnapshot);
        toast({ title: res.error, variant: "destructive" });
        return;
      }
      toast({ title: `${atHandle(u.handle)} → ${nextRole}` });
      onChanged();
    },
    [users, stats, sendPatch, toast, onChanged]
  );

  const visibleUsers: AdminUser[] = (() => {
    if (!users) return [];
    const contentOf = (u: AdminUser) =>
      u.threads + u.replies + u.reviews + u.bookmarks;
    const at = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);
    const copy = [...users];
    if (sort === "activity") return copy.sort((a, b) => at(b.lastActivityAt) - at(a.lastActivityAt));
    if (sort === "content") return copy.sort((a, b) => contentOf(b) - contentOf(a));
    return copy;
  })();

  return (
    <div className="space-y-3">
      {/* stats strip */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MiniStat label="Total users" value={stats?.total ?? "…"} />
        <MiniStat label="Moderators" value={stats?.moderators ?? "…"} />
        <MiniStat label="Admins" value={stats?.admins ?? "…"} />
        <MiniStat label="Banned" value={stats?.banned ?? "…"} accent={(stats?.banned ?? 0) > 0} />
      </div>

      {/* filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative max-w-xs flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/55"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search handle / name / email…"
            aria-label="Search users"
            className={cn(inputCx, "pl-8")}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filter by status" className={cn(inputCx, "w-32")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-coal text-white">
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger aria-label="Filter by role" className={cn(inputCx, "w-36")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-coal text-white">
            {ROLE_FILTERS.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as UserSort)}>
          <SelectTrigger aria-label="Sort users" className={cn(inputCx, "w-44")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-coal text-white">
            {SORT_VALUES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <LoadError label="Users" onRetry={retry} />
      ) : users === null ? (
        <UsersSkeleton />
      ) : users.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/55">No users match.</p>
      ) : (
        <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
          {visibleUsers.map((u) => {
            const initial = (u.name ?? u.handle.replace(/^@/, "") ?? "?").charAt(0).toUpperCase();
            return (
              <div
                key={u.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5"
              >
                {u.image ? (
                  <img
                    src={u.image}
                    alt=""
                    loading="lazy"
                    className={cn(
                      "size-9 shrink-0 rounded-full border object-cover",
                      u.status === "banned" ? "border-red-400/30" : "border-white/10"
                    )}
                  />
                ) : (
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold",
                      u.status === "banned"
                        ? "border-red-400/30 bg-red-400/10 text-red-300"
                        : "border-white/10 bg-white/5 text-white/70"
                    )}
                  >
                    {initial}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">
                    <span className="font-mono text-ember">{atHandle(u.handle)}</span>
                    {u.name && <span className="ml-2 font-normal text-white/60">{u.name}</span>}
                  </p>
                  <p className="truncate font-mono text-xs text-white/60">
                    {u.email} · joined {new Date(u.createdAt).toISOString().slice(0, 10)}
                    <span className="text-white/45">
                      {" "}· last active {relTime(u.lastActivityAt)}
                    </span>
                  </p>
                </div>

                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 font-mono text-xs tracking-wider uppercase",
                    ROLE_BADGE_CX[u.role]
                  )}
                >
                  {u.role}
                </span>
                {u.status === "banned" && (
                  <span className="shrink-0 rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 font-mono text-xs tracking-wider text-red-300 uppercase">
                    Banned
                  </span>
                )}

                <span
                  className="hidden shrink-0 font-mono text-xs text-white/60 md:block"
                  title={`${u.threads} threads · ${u.replies} replies · ${u.reviews} reviews · ${u.reportsFiled} reports filed`}
                >
                  T{u.threads} · R{u.replies} · V{u.reviews}
                  {u.reportsFiled > 0 && (
                    <span className="text-red-300/80"> · F{u.reportsFiled}</span>
                  )}
                </span>

                <Select
                  value={u.role}
                  onValueChange={(v) => void changeRole(u, v)}
                  disabled={busy === u.id}
                >
                  <SelectTrigger
                    aria-label={`Role for ${atHandle(u.handle)}`}
                    className={cn(inputCx, "h-8 w-[8.5rem] text-sm")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-coal text-white">
                    {ROLE_VALUES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === u.id}
                  aria-expanded={avatarOpen === u.id}
                  aria-label={`Avatar for ${atHandle(u.handle)}`}
                  onClick={() => setAvatarOpen(avatarOpen === u.id ? null : u.id)}
                  className={cn(
                    "h-8 shrink-0 rounded-lg",
                    avatarOpen === u.id
                      ? "bg-white/5 text-ember"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  <ImagePlus className="size-3.5" aria-hidden />
                  <span className="hidden lg:inline">Avatar</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === u.id}
                  aria-label={`Inspect ${atHandle(u.handle)}`}
                  onClick={() => setInspect(u.id)}
                  className="h-8 shrink-0 rounded-lg text-white/60 hover:text-white"
                >
                  <Eye className="size-3.5" aria-hidden />
                  <span className="hidden lg:inline">Inspect</span>
                </Button>

                {u.status === "active" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === u.id}
                    aria-expanded={banning === u.id}
                    onClick={() => {
                      setBanning(banning === u.id ? null : u.id);
                      setBanNote("");
                      setBanSweep(true);
                    }}
                    className="h-8 shrink-0 rounded-lg border-red-400/30 text-red-400 hover:bg-red-400/10 hover:text-red-300"
                  >
                    <Ban className="size-3.5" aria-hidden />
                    Ban
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === u.id}
                    aria-expanded={banning === u.id}
                    onClick={() => {
                      setBanning(banning === u.id ? null : u.id);
                      setBanNote("");
                      setBanSweep(true);
                    }}
                    className="h-8 shrink-0 rounded-lg border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300"
                  >
                    <ShieldCheck className="size-3.5" aria-hidden />
                    Unban
                  </Button>
                )}

                {banning === u.id && (
                  <div className="w-full space-y-2.5 rounded-lg border border-red-400/25 bg-red-400/[0.04] p-3">
                    <p className="font-mono text-xs tracking-widest text-red-300">
                      {u.status === "active"
                        ? `BAN ${atHandle(u.handle).toUpperCase()} · REVOKES SESSIONS · SILENCES FUTURE POSTS`
                        : `REINSTATE ${atHandle(u.handle).toUpperCase()} · ACCOUNT ACTIVE AGAIN`}
                    </p>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
                      <Checkbox
                        checked={banSweep}
                        onCheckedChange={(v) => setBanSweep(v === true)}
                        className="size-3 border-white/30 data-[state=checked]:border-red-400 data-[state=checked]:bg-red-400"
                      />
                      {u.status === "active"
                        ? "Also hide their existing content (threads, replies, reviews)"
                        : "Restore their previously hidden content"}
                    </label>
                    <Textarea
                      value={banNote}
                      onChange={(e) => setBanNote(e.target.value)}
                      maxLength={200}
                      placeholder="Reason (optional, kept in the audit trail)…"
                      rows={2}
                      aria-label="Moderation reason"
                      className={cn(inputCx, "resize-none bg-white/[0.03]")}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busy === u.id}
                        onClick={() => {
                          setBanning(null);
                          void toggleBan(u, banNote, banSweep);
                        }}
                        className={cn(
                          "rounded-lg text-white shadow-none disabled:opacity-40",
                          u.status === "active"
                            ? "bg-red-500 hover:bg-red-400"
                            : "bg-emerald-500 hover:bg-emerald-400"
                        )}
                      >
                        {busy === u.id ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                        {u.status === "active" ? "Confirm ban" : "Confirm reinstate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setBanning(null)}
                        className="rounded-lg text-white/60 hover:text-white"
                      >
                        Back
                      </Button>
                    </div>
                  </div>
                )}

                {avatarOpen === u.id && (
                  <div className="w-full border-t border-white/10 pt-3">
                    <ImageUploadField
                      value={u.image}
                      onChange={(url) => void setAvatar(u, url)}
                      purpose="avatar"
                      endpoint="admin"
                      editorKey={apiKey}
                      label="Avatar image"
                      hint={u.image
                        ? "Replace it, or Remove to clear the avatar."
                        : "Square image works best. Saved instantly, no extra step."}
                      disabled={busy === u.id}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {hasMore && users && users.length > 0 && !error && (
        <Button
          size="sm"
          variant="outline"
          onClick={loadMore}
          disabled={loadingMore}
          className="h-9 shrink-0 self-center rounded-lg border-white/15 px-4 text-white/70 shadow-none hover:bg-white/5 hover:text-white"
        >
          {loadingMore ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          Load more
        </Button>
      )}

      {inspect && (
        <UserDrawer apiKey={apiKey} userId={inspect} onClose={() => setInspect(null)} />
      )}

      <p className="font-mono text-xs leading-relaxed text-white/55">
        BANNING REVOKES ACTIVE SESSIONS SERVER-SIDE · ADMIN ACCOUNTS CAN'T BE
        BANNED AND THE LAST ADMIN CAN'T BE DEMOTED · ROLE CHANGES APPLY ON THE
        NEXT REQUEST · T/R/V/F = THREADS / REPLIES / REVIEWS / REPORTS FILED
      </p>
    </div>
  );
}
