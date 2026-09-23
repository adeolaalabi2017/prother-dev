"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, ImagePlus, Search, ShieldCheck } from "lucide-react";
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

  const load = useCallback(() => {
    adminFetch(
      apiKey,
      `/api/admin/users?q=${encodeURIComponent(q)}&status=${status}&role=${role}`
    )
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ users: AdminUser[]; stats: UsersStats }>;
      })
      .then((d) => {
        setUsers(d.users);
        setStats(d.stats);
        setError(false);
      })
      .catch(() => setError(true));
  }, [apiKey, q, status, role]);

  // Debounced search (~250ms) — mirrors the ListingsTab pattern.
  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const retry = useCallback(() => {
    setUsers(null);
    setError(false);
    load();
  }, [load]);

  const sendPatch = useCallback(
    async (id: string, body: { role?: string; status?: string }) => {
      setBusy(id);
      try {
        const res = await adminFetch(apiKey, `/api/admin/users/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        const d = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !d.ok) return { ok: false as const, error: d.error ?? "Update failed" };
        return { ok: true as const };
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
    async (u: AdminUser) => {
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
      const res = await sendPatch(u.id, { status: nextStatus });
      if (!res.ok) {
        setUsers(usersSnapshot);
        setStats(statsSnapshot);
        toast({ title: res.error, variant: "destructive" });
        return;
      }
      toast({
        title: nextStatus === "banned" ? `${atHandle(u.handle)} banned` : `${atHandle(u.handle)} reinstated`,
        description:
          nextStatus === "banned" ? "Sessions revoked. Sign-ins dead." : "Account is active again.",
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
      </div>

      {error ? (
        <LoadError label="Users" onRetry={retry} />
      ) : users === null ? (
        <UsersSkeleton />
      ) : users.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/55">No users match.</p>
      ) : (
        <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
          {users.map((u) => {
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
                      "flex size-9 shrink-0 items-center justify-center rounded-xl border text-sm font-black",
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
                  title={`${u.threads} threads · ${u.replies} replies · ${u.reviews} reviews`}
                >
                  T{u.threads} · R{u.replies} · V{u.reviews}
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

                {u.status === "active" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === u.id}
                    onClick={() => void toggleBan(u)}
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
                    onClick={() => void toggleBan(u)}
                    className="h-8 shrink-0 rounded-lg border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300"
                  >
                    <ShieldCheck className="size-3.5" aria-hidden />
                    Unban
                  </Button>
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

      <p className="font-mono text-xs leading-relaxed text-white/55">
        BANNING REVOKES ACTIVE SESSIONS SERVER-SIDE · ROLE CHANGES APPLY ON THE
        NEXT REQUEST · T/R/V = THREADS / REPLIES / REVIEWS
      </p>
    </div>
  );
}
