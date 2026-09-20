"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BarChart3,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  ExternalLink,
  FileText,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Mail,
  Pencil,
  Pin,
  Plus,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Tags,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { STANDARD_DEFS } from "@/lib/standards";
import { useExplorer } from "./explorer-store";

/**
 * Admin Console (PRD F-49/F-50 expansion) — one backstage surface managing
 * the whole site: overview KPIs, moderation queue, launch calendar, listings,
 * Journal posts, taxonomy, subscribers, and frontend copy — no deploys.
 * Demo key auth (`x-editor-key`) shared with the editor desk; NextAuth in P2.
 */

// ── shared helpers ───────────────────────────────────────────────────────

const KEY_STORAGE = "prother_editor_key";
const DEMO_HINT = "ember-dev";

function useAdminKey() {
  // Lazy init (guarded for SSR) — the dialog content only renders after the
  // user opens it, so restoring the key at mount never causes a hydration gap.
  const [key, setKey] = useState<string | null>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(KEY_STORAGE) : null
  );
  const unlock = useCallback((k: string) => {
    sessionStorage.setItem(KEY_STORAGE, k);
    setKey(k);
  }, []);
  const lock = useCallback(() => {
    sessionStorage.removeItem(KEY_STORAGE);
    setKey(null);
  }, []);
  return { key, unlock, lock };
}

function adminFetch(key: string, url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      "x-editor-key": key,
      ...init?.headers,
    },
  }).then(async (r) => {
    if (r.status === 401) throw new Error("401");
    return r;
  });
}

const inputCx =
  "border-white/10 bg-white/5 text-white placeholder:text-white/25 text-sm";
const labelCx =
  "font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={labelCx}>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-white/30">{hint}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-14 text-white/30">
      <Loader2 className="size-5 animate-spin" aria-hidden />
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        accent
          ? "border-ember/40 bg-ember/10"
          : "border-white/10 bg-white/[0.03]"
      )}
    >
      <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] text-white/45 uppercase">
        {icon}
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-2xl font-black tracking-tight",
          accent ? "text-ember" : "text-white"
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ── Gate ─────────────────────────────────────────────────────────────────

function Gate({ onUnlock }: { onUnlock: (key: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-ember/30 bg-ember/10">
        <KeyRound className="size-6 text-ember" aria-hidden />
      </div>
      <h2 className="mt-5 text-xl font-black tracking-tight text-white">
        Admin access
      </h2>
      <p className="mt-1.5 max-w-xs text-sm text-white/50">
        Full backstage: listings, calendar, journal, taxonomy, subscribers, and
        site copy. Demo key:{" "}
        <button
          type="button"
          onClick={() => setValue(DEMO_HINT)}
          className="font-mono text-ember underline-offset-2 hover:underline"
        >
          {DEMO_HINT}
        </button>
      </p>
      <form
        className="mt-6 flex w-full max-w-xs gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onUnlock(value.trim());
        }}
      >
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Admin key"
          type="password"
          aria-label="Admin key"
          className={inputCx}
        />
        <Button
          type="submit"
          className="rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
        >
          Unlock
        </Button>
      </form>
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────────────

type Overview = {
  kpis: {
    subscribers: number;
    toolsLive: number;
    toolsDraft: number;
    toolsRemoved: number;
    launchesToday: number;
    launchesTomorrow: number;
    pendingSubs: number;
    votes: number;
    comments: number;
    postsPublished: number;
    postsDrafts: number;
    postViews: number;
    categories: number;
  };
  queueAgeH: number;
  oldestPending: string | null;
  audit: { id: string; action: string; entity: string; meta: string; at: string }[];
};

type AdminTool = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string | null;
  websiteUrl: string;
  logoEmoji: string;
  logoGradient: string;
  pricingModel: string;
  startingPrice: string | null;
  pricingNote: string | null;
  hasApi: boolean;
  githubUrl: string | null;
  docsUrl: string | null;
  twitterUrl: string | null;
  tags: string;
  track: string;
  status: string;
  pinned: number;
  editorsPick: boolean;
  curated: boolean;
  claimed: boolean;
  makerHandle: string;
  verifiedAt: string | null;
  category: { id: string; name: string; emoji: string; slug: string };
  votes: number;
  launchDate: string | null;
  scheduled: boolean;
  createdAt: string;
};

type AdminPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string;
  coverEmoji: string;
  coverGradient: string;
  status: string;
  author: string;
  readingMinutes: number;
  views: number;
  seoTitle: string | null;
  seoDescription: string | null;
  keywords: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

type DaySlot = {
  date: string;
  weekday: string;
  locked: boolean;
  count: number;
  teaserCount: number;
  tools: {
    launchId: string;
    id: string;
    slug: string;
    name: string;
    logoEmoji: string;
    logoGradient: string;
    track: string;
    status: string;
    editorsPick: boolean;
    pinned: number;
    category: string;
    votes: number;
    scheduled: boolean;
  }[];
};

type ScheduleData = {
  floor: number;
  cap: number;
  days: DaySlot[];
  pool: {
    id: string;
    slug: string;
    name: string;
    logoEmoji: string;
    logoGradient: string;
    track: string;
    status: string;
    waitingDays: number;
    category: { name: string; emoji: string };
  }[];
};

// ── Tab: Overview ────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: Overview }) {
  const k = data.kpis;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={<Users className="size-3" aria-hidden />} label="Subscribers" value={k.subscribers.toLocaleString()} />
        <Kpi icon={<Database className="size-3" aria-hidden />} label="Live listings" value={k.toolsLive} />
        <Kpi
          icon={<CalendarDays className="size-3" aria-hidden />}
          label="Launches today"
          value={k.launchesToday}
          accent={k.launchesToday < 5}
        />
        <Kpi
          icon={<ListChecks className="size-3" aria-hidden />}
          label="Queue pending"
          value={k.pendingSubs}
          accent={k.pendingSubs > 0}
        />
        <Kpi icon={<BarChart3 className="size-3" aria-hidden />} label="Total votes" value={k.votes.toLocaleString()} />
        <Kpi icon={<Mail className="size-3" aria-hidden />} label="Comments" value={k.comments} />
        <Kpi icon={<FileText className="size-3" aria-hidden />} label="Journal posts" value={`${k.postsPublished}${k.postsDrafts ? ` +${k.postsDrafts} d` : ""}`} />
        <Kpi icon={<ExternalLink className="size-3" aria-hidden />} label="Post views" value={k.postViews.toLocaleString()} />
      </div>

      {data.oldestPending && data.queueAgeH > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-ember/30 bg-ember/5 px-4 py-3">
          <Clock className="size-4 shrink-0 text-ember" aria-hidden />
          <p className="text-sm text-white/70">
            Oldest queue item: <strong className="text-white">{data.oldestPending}</strong>{" "}
            — waiting {data.queueAgeH}h
            {data.queueAgeH > 14 && (
              <span className="ml-2 font-mono text-[10px] tracking-wider text-red-300 uppercase">
                past 14h SLA
              </span>
            )}
          </p>
        </div>
      )}

      <div>
        <p className={labelCx}>Recent admin activity (audit trail)</p>
        <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {data.audit.length === 0 && (
            <p className="py-6 text-center text-sm text-white/30">
              No admin actions recorded yet.
            </p>
          )}
          {data.audit.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
            >
              <span className="rounded bg-ember/10 px-1.5 py-0.5 font-mono text-[10px] text-ember">
                {a.action}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-white/60">
                {a.meta || a.entity}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-white/30">
                {new Date(a.at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Queue (quick moderation) ────────────────────────────────────────

type PendingSub = {
  id: string;
  name: string;
  tagline: string;
  domain: string;
  email: string;
  ageH: number;
  logoEmoji: string;
  logoGradient: string;
};

function QueueTab({ apiKey, onChanged }: { apiKey: string; onChanged: () => void }) {
  const { toast } = useToast();
  const [subs, setSubs] = useState<PendingSub[] | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    adminFetch(apiKey, "/api/editor/queue")
      .then((r) => r.json())
      .then((d: { pending?: PendingSub[] }) => setSubs(d.pending ?? []))
      .catch(() => setSubs([]));
  }, [apiKey]);

  useEffect(load, [load]);

  const decide = useCallback(
    async (id: string, decision: "approve" | "reject") => {
      setBusy(id);
      try {
        const res = await adminFetch(apiKey, "/api/editor/decision", {
          method: "POST",
          body: JSON.stringify(
            decision === "approve"
              ? { decision, id }
              : { decision, id, failedStandards: failed, note: "" }
          ),
        });
        const d = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !d.ok) {
          toast({ title: d.error ?? "Decision failed", variant: "destructive" });
          return;
        }
        toast({
          title: decision === "approve" ? "Approved & scheduled" : "Rejected",
          description:
            decision === "approve"
              ? "Launches tomorrow at 00:00 UTC."
              : "Maker email names the failed standards.",
        });
        setRejecting(null);
        setFailed([]);
        load();
        onChanged();
      } catch {
        toast({ title: "Network error", variant: "destructive" });
      } finally {
        setBusy(null);
      }
    },
    [apiKey, failed, load, onChanged, toast]
  );

  if (subs === null) return <Spinner />;

  return (
    <div className="space-y-3">
      {subs.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
          <CheckCircle2 className="mx-auto size-8 text-emerald-400" aria-hidden />
          <p className="mt-3 font-mono text-sm text-white/60">
            Queue clear — nothing waiting.
          </p>
        </div>
      )}
      {subs.map((s) => (
        <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg",
                s.logoGradient
              )}
            >
              {s.logoEmoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{s.name}</p>
              <p className="truncate text-xs text-white/50">{s.tagline}</p>
            </div>
            <span className="hidden shrink-0 font-mono text-[10px] text-white/40 sm:block">
              {s.domain} · {s.ageH}h
            </span>
          </div>

          {rejecting === s.id ? (
            <div className="mt-3 space-y-2.5 rounded-lg border border-red-400/25 bg-red-400/[0.05] p-3">
              <p className="font-mono text-[10px] tracking-widest text-red-300">
                REJECTIONS MUST CITE FAILED STANDARD(S)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STANDARD_DEFS.map((sd) => {
                  const on = failed.includes(sd.id);
                  return (
                    <label
                      key={sd.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]",
                        on ? "border-red-400 bg-red-400/15 text-red-200" : "border-white/15 text-white/60"
                      )}
                    >
                      <Checkbox
                        checked={on}
                        onCheckedChange={(v) =>
                          setFailed((p) => (v ? [...p, sd.id] : p.filter((x) => x !== sd.id)))
                        }
                        className="size-3 border-white/30 data-[state=checked]:border-red-400 data-[state=checked]:bg-red-400"
                      />
                      {sd.id}
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={failed.length === 0 || busy === s.id}
                  onClick={() => void decide(s.id, "reject")}
                  className="rounded-lg bg-red-500 text-white shadow-none hover:bg-red-400 disabled:opacity-40"
                >
                  Reject ({failed.length})
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRejecting(null)}
                  className="rounded-lg text-white/60 hover:text-white"
                >
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={busy === s.id}
                onClick={() => void decide(s.id, "approve")}
                className="rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
              >
                {busy === s.id ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <CalendarClock className="size-3.5" aria-hidden />
                )}
                Approve → tomorrow
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejecting(s.id)}
                className="rounded-lg border-red-400/30 text-red-400 hover:bg-red-400/10 hover:text-red-300"
              >
                Reject…
              </Button>
              <a
                href={s.email ? `mailto:${s.email}` : "#"}
                className="ml-auto hidden items-center gap-1 font-mono text-[10px] text-white/40 hover:text-white/70 sm:flex"
              >
                <Mail className="size-3" aria-hidden /> maker
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Tab: Calendar ────────────────────────────────────────────────────────

function CalendarTab({ apiKey, onChanged }: { apiKey: string; onChanged: () => void }) {
  const { toast } = useToast();
  const [data, setData] = useState<ScheduleData | null>(null);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    adminFetch(apiKey, "/api/admin/schedule")
      .then((r) => r.json())
      .then((d: ScheduleData) => setData(d))
      .catch(() => toast({ title: "Calendar unavailable", variant: "destructive" }));
  }, [apiKey, toast]);

  useEffect(load, [load]);

  const schedule = useCallback(
    async (toolId: string, date: string | null, name: string) => {
      setBusy(toolId);
      try {
        const res = await adminFetch(apiKey, "/api/admin/schedule", {
          method: "POST",
          body: JSON.stringify({ toolId, date }),
        });
        const d = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !d.ok) {
          toast({ title: d.error ?? "Scheduling failed", variant: "destructive" });
          return;
        }
        toast({ title: date ? `${name} → ${date}` : `${name} unscheduled` });
        load();
        onChanged();
      } catch {
        toast({ title: "Network error", variant: "destructive" });
      } finally {
        setBusy(null);
      }
    },
    [apiKey, load, onChanged, toast]
  );

  if (!data) return <Spinner />;

  const chip = (n: number) => {
    if (n < data.floor) return { emoji: "🔴", label: "below floor" };
    if (n >= 11) return { emoji: "🟡", label: "11–15" };
    return { emoji: "🟢", label: `${data.floor}–10` };
  };

  return (
    <div className="space-y-5">
      <p className="font-mono text-[10px] tracking-wider text-white/35 uppercase">
        Floor ≥{data.floor} · Cap ≤{data.cap} · today locked (live ranking)
      </p>

      {/* 14-day grid */}
      <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {data.days.map((d) => {
          const c = chip(d.count);
          return (
            <div
              key={d.date}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-20 shrink-0 font-mono text-[11px] text-white/70">
                  {d.weekday} {d.date.slice(5)}
                </span>
                <span
                  title={c.label}
                  className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/60"
                >
                  {d.locked ? "🔒" : c.emoji} {d.count}
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                  {d.tools.map((t) => (
                    <span
                      key={t.id}
                      className={cn(
                        "group inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                        t.scheduled
                          ? "border-ember/40 bg-ember/10 text-ember"
                          : "border-white/15 bg-white/5 text-white/70"
                      )}
                    >
                      <span aria-hidden>{t.logoEmoji}</span>
                      {t.name}
                      {t.editorsPick && <span aria-hidden>⭐</span>}
                      {!d.locked && (
                        <button
                          type="button"
                          onClick={() => void schedule(t.id, null, t.name)}
                          aria-label={`Unschedule ${t.name}`}
                          className="ml-0.5 text-white/30 transition-colors hover:text-red-400"
                        >
                          <X className="size-3" aria-hidden />
                        </button>
                      )}
                    </span>
                  ))}
                  {d.tools.length === 0 && (
                    <span className="font-mono text-[10px] text-white/25">empty</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* unscheduled pool */}
      <div>
        <p className={labelCx}>Unscheduled pool ({data.pool.length})</p>
        <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {data.pool.length === 0 && (
            <p className="py-6 text-center text-sm text-white/30">
              Pool empty — every listing is on the calendar.
            </p>
          )}
          {data.pool.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
            >
              <span aria-hidden className="text-base">{t.logoEmoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{t.name}</p>
                <p className="truncate font-mono text-[10px] text-white/40">
                  {t.category.emoji} {t.category.name} · {t.track === "editor_seed" ? "seed" : "sub"} · waiting {t.waitingDays}d
                </p>
              </div>
              <Input
                type="date"
                value={dates[t.id] ?? ""}
                onChange={(e) => setDates((p) => ({ ...p, [t.id]: e.target.value }))}
                aria-label={`Launch date for ${t.name}`}
                className="h-8 w-36 border-white/10 bg-white/5 px-2 font-mono text-[11px] text-white"
              />
              <Button
                size="sm"
                disabled={!dates[t.id] || busy === t.id}
                onClick={() => void schedule(t.id, dates[t.id], t.name)}
                className="h-8 rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot disabled:opacity-30 dark:text-black"
              >
                <CalendarClock className="size-3.5" aria-hidden />
                Schedule
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Listings ────────────────────────────────────────────────────────

const GRADIENTS = [
  "from-orange-500 to-amber-700",
  "from-amber-500 to-orange-700",
  "from-rose-600 to-orange-700",
  "from-lime-600 to-emerald-700",
  "from-yellow-500 to-orange-600",
  "from-orange-600 to-red-700",
];

function ListingEditor({
  apiKey,
  tool,
  categories,
  onSaved,
}: {
  apiKey: string;
  tool: AdminTool;
  categories: { id: string; name: string; emoji: string }[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    tagline: tool.tagline,
    description: tool.description ?? "",
    pricingModel: tool.pricingModel,
    startingPrice: tool.startingPrice ?? "",
    pricingNote: tool.pricingNote ?? "",
    websiteUrl: tool.websiteUrl,
    githubUrl: tool.githubUrl ?? "",
    docsUrl: tool.docsUrl ?? "",
    twitterUrl: tool.twitterUrl ?? "",
    tags: tool.tags,
    status: tool.status,
    pinned: tool.pinned,
    editorsPick: tool.editorsPick,
    curated: tool.curated,
    claimed: tool.claimed,
    makerHandle: tool.makerHandle,
    categoryId: tool.category.id,
  });

  const save = async () => {
    setBusy(true);
    try {
      const res = await adminFetch(apiKey, "/api/admin/tools", {
        method: "PATCH",
        body: JSON.stringify({
          id: tool.id,
          tagline: f.tagline,
          description: f.description || null,
          pricingModel: f.pricingModel,
          startingPrice: f.startingPrice || null,
          pricingNote: f.pricingNote || null,
          websiteUrl: f.websiteUrl,
          githubUrl: f.githubUrl || null,
          docsUrl: f.docsUrl || null,
          twitterUrl: f.twitterUrl || null,
          tags: f.tags,
          status: f.status,
          pinned: f.pinned,
          editorsPick: f.editorsPick,
          curated: f.curated,
          claimed: f.claimed,
          makerHandle: f.makerHandle,
          categoryId: f.categoryId,
        }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) {
        toast({ title: d.error ?? "Save failed", variant: "destructive" });
        return;
      }
      toast({ title: `${tool.name} saved` });
      onSaved();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await adminFetch(apiKey, `/api/admin/tools?id=${tool.id}`, {
        method: "DELETE",
      });
      const d = (await res.json()) as { ok?: boolean };
      if (res.ok && d.ok) {
        toast({ title: `${tool.name} removed (soft — history kept)` });
        onSaved();
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const res = await adminFetch(apiKey, "/api/admin/tools", {
        method: "PATCH",
        body: JSON.stringify({ id: tool.id, verify: true }),
      });
      const d = (await res.json()) as { ok?: boolean };
      if (res.ok && d.ok) {
        toast({ title: `${tool.name} marked verified`, description: "Verified-at stamped — staleness clock reset." });
        onSaved();
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 border-t border-white/10 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tagline (5–60)">
          <Input
            value={f.tagline}
            maxLength={60}
            onChange={(e) => setF({ ...f, tagline: e.target.value })}
            className={inputCx}
          />
          <p className="text-[10px] text-white/30">{f.tagline.length}/60</p>
        </Field>
        <Field label="Website URL">
          <Input
            value={f.websiteUrl}
            onChange={(e) => setF({ ...f, websiteUrl: e.target.value })}
            className={inputCx}
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            rows={3}
            className={inputCx}
          />
        </Field>
        <Field label="Tags (pipe-separated, ≤5)">
          <Input
            value={f.tags}
            onChange={(e) => setF({ ...f, tags: e.target.value })}
            className={inputCx}
            placeholder="open-source|api-available"
          />
        </Field>
        <Field label="Pricing model">
          <Select value={f.pricingModel} onValueChange={(v) => setF({ ...f, pricingModel: v })}>
            <SelectTrigger className={inputCx}><SelectValue /></SelectTrigger>
            <SelectContent className="border-white/10 bg-coal text-white">
              {["free", "freemium", "paid", "open_source"].map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Start price">
            <Input
              value={f.startingPrice}
              onChange={(e) => setF({ ...f, startingPrice: e.target.value })}
              className={inputCx}
              placeholder="$19/mo"
            />
          </Field>
          <Field label="Price note">
            <Input
              value={f.pricingNote}
              onChange={(e) => setF({ ...f, pricingNote: e.target.value })}
              className={inputCx}
            />
          </Field>
        </div>
        <Field label="Category">
          <Select value={f.categoryId} onValueChange={(v) => setF({ ...f, categoryId: v })}>
            <SelectTrigger className={inputCx}><SelectValue /></SelectTrigger>
            <SelectContent className="border-white/10 bg-coal text-white">
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Maker handle">
          <Input
            value={f.makerHandle}
            onChange={(e) => setF({ ...f, makerHandle: e.target.value })}
            className={inputCx}
          />
        </Field>
        <Field label="GitHub URL">
          <Input value={f.githubUrl} onChange={(e) => setF({ ...f, githubUrl: e.target.value })} className={inputCx} />
        </Field>
        <Field label="Docs URL">
          <Input value={f.docsUrl} onChange={(e) => setF({ ...f, docsUrl: e.target.value })} className={inputCx} />
        </Field>
        <Field label="Status">
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
            <SelectTrigger className={inputCx}><SelectValue /></SelectTrigger>
            <SelectContent className="border-white/10 bg-coal text-white">
              {["live", "draft", "pending_review", "approved", "removed"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Pin rank (0 = none, leads feed)">
          <Input
            type="number"
            min={0}
            max={3}
            value={f.pinned}
            onChange={(e) => setF({ ...f, pinned: Math.max(0, Math.min(3, Number(e.target.value) || 0)) })}
            className={inputCx}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-5">
        {(
          [
            ["editorsPick", "Editor's Pick ⭐", f.editorsPick],
            ["curated", "Curated badge", f.curated],
            ["claimed", "Claimed", f.claimed],
          ] as const
        ).map(([key, label, val]) => (
          <label key={key} className="flex items-center gap-2 text-xs text-white/70">
            <Switch checked={val} onCheckedChange={(v) => setF({ ...f, [key]: v })} />
            {label}
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3.5">
        <Button
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          Save changes
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void verify()}
          className="rounded-lg border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300"
        >
          <ShieldCheck className="size-4" aria-hidden />
          Mark verified
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => void remove()}
          className="ml-auto rounded-lg text-red-400 hover:bg-red-400/10 hover:text-red-300"
        >
          <Trash2 className="size-4" aria-hidden />
          Remove listing
        </Button>
      </div>
    </div>
  );
}

function ListingsTab({ apiKey, onChanged }: { apiKey: string; onChanged: () => void }) {
  const { toast } = useToast();
  const [tools, setTools] = useState<AdminTool[] | null>(null);
  const [cats, setCats] = useState<{ id: string; name: string; emoji: string }[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    adminFetch(apiKey, `/api/admin/tools?q=${encodeURIComponent(q)}&status=${status}`)
      .then((r) => r.json())
      .then((d: { tools: AdminTool[] }) => setTools(d.tools))
      .catch(() => toast({ title: "Listings unavailable", variant: "destructive" }));
  }, [apiKey, q, status, toast]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  useEffect(() => {
    adminFetch(apiKey, "/api/admin/categories")
      .then((r) => r.json())
      .then((d: { categories: { id: string; name: string; emoji: string }[] }) =>
        setCats(d.categories)
      )
      .catch(() => {});
  }, [apiKey]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name / tagline / slug…"
          className={cn(inputCx, "max-w-xs flex-1")}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className={cn(inputCx, "w-36")}><SelectValue /></SelectTrigger>
          <SelectContent className="border-white/10 bg-coal text-white">
            {["all", "live", "draft", "pending_review", "approved", "removed"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tools === null && <Spinner />}
      {tools?.length === 0 && (
        <p className="py-10 text-center text-sm text-white/30">No listings match.</p>
      )}
      <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
        {tools?.map((t) => (
          <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.02]">
            <button
              type="button"
              aria-expanded={expanded === t.id}
              onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-white/[0.03]"
            >
              <span aria-hidden className="text-lg">{t.logoEmoji}</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-bold text-white">
                  {t.name}
                  {t.pinned > 0 && <Pin className="size-3 text-ember" aria-hidden />}
                  {t.editorsPick && <span aria-hidden title="Editor's Pick">⭐</span>}
                  {t.status !== "live" && (
                    <span className="rounded bg-white/10 px-1.5 py-px font-mono text-[9px] text-white/60">
                      {t.status}
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-white/50">{t.tagline}</p>
              </div>
              <span className="hidden shrink-0 font-mono text-[10px] text-white/40 md:block">
                {t.category.emoji} {t.category.name}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-ember">▲{t.votes}</span>
              <ChevronDown
                className={cn("size-4 shrink-0 text-white/40 transition-transform", expanded === t.id && "rotate-180")}
                aria-hidden
              />
            </button>
            {expanded === t.id && (
              <ListingEditor
                apiKey={apiKey}
                tool={t}
                categories={cats}
                onSaved={() => {
                  load();
                  onChanged();
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Journal (blog CRUD) ─────────────────────────────────────────────

type PostDraft = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string;
  coverEmoji: string;
  coverGradient: string;
  author: string;
  status: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string;
};

const EMPTY_POST: PostDraft = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  category: "Playbooks",
  tags: "",
  coverEmoji: "📝",
  coverGradient: GRADIENTS[0],
  author: "Prother Editorial",
  status: "draft",
  seoTitle: "",
  seoDescription: "",
  keywords: "",
};

function PostEditor({
  apiKey,
  draft,
  onDone,
}: {
  apiKey: string;
  draft: PostDraft;
  onDone: (openSlug?: string) => void;
}) {
  const { toast } = useToast();
  const [f, setF] = useState<PostDraft>(draft);
  const [busy, setBusy] = useState(false);
  const isNew = !f.id;

  const save = async (publishOverride?: string) => {
    setBusy(true);
    try {
      const payload = {
        title: f.title,
        slug: f.slug || undefined,
        excerpt: f.excerpt,
        // Only send the body when rewritten — a metadata-only edit of an
        // existing post keeps the stored markdown server-side.
        ...(f.body.trim().length >= 50 ? { body: f.body } : {}),
        category: f.category,
        tags: f.tags,
        coverEmoji: f.coverEmoji,
        coverGradient: f.coverGradient,
        author: f.author,
        status: publishOverride ?? f.status,
        seoTitle: f.seoTitle || undefined,
        seoDescription: f.seoDescription || undefined,
        keywords: f.keywords || undefined,
      };
      const res = await adminFetch(
        apiKey,
        isNew ? "/api/admin/posts" : `/api/admin/posts/${f.id}`,
        { method: isNew ? "POST" : "PATCH", body: JSON.stringify(payload) }
      );
      const d = (await res.json()) as { ok?: boolean; error?: string; slug?: string };
      if (!res.ok || !d.ok) {
        toast({ title: d.error ?? "Save failed", variant: "destructive" });
        return;
      }
      toast({
        title: publishOverride === "published" ? "Published" : "Saved",
        description: d.slug ? `/?post=${d.slug}` : undefined,
      });
      onDone(publishOverride === "published" ? d.slug : undefined);
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!f.id) return;
    setBusy(true);
    try {
      const res = await adminFetch(apiKey, `/api/admin/posts/${f.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Post deleted" });
        onDone();
      }
    } finally {
      setBusy(false);
    }
  };

  const seoTitle = f.seoTitle || f.title;
  const seoDesc = f.seoDescription || f.excerpt;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title (≤120)">
          <Input value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCx} placeholder="How to launch an AI tool…" />
        </Field>
        <Field label="Slug (auto from title if blank)">
          <Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} className={cn(inputCx, "font-mono")} placeholder="how-to-launch-an-ai-tool" />
        </Field>
      </div>

      <Field label="Excerpt (20–200 · cards + meta description)">
        <Textarea value={f.excerpt} rows={2} maxLength={200} onChange={(e) => setF({ ...f, excerpt: e.target.value })} className={inputCx} />
        <p className="text-[10px] text-white/30">{f.excerpt.length}/200</p>
      </Field>

      <Field label="Body (markdown: ##, lists, **bold**, `code`, ``` blocks)">
        <Textarea
          value={f.body}
          rows={10}
          onChange={(e) => setF({ ...f, body: e.target.value })}
          className={cn(inputCx, "font-mono text-xs leading-relaxed")}
        />
        <p className="text-[10px] text-white/30">
          {f.body.split(/\s+/).filter(Boolean).length} words · ~
          {Math.max(1, Math.round(f.body.split(/\s+/).filter(Boolean).length / 220))} min read
        </p>
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Category">
          <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
            <SelectTrigger className={inputCx}><SelectValue /></SelectTrigger>
            <SelectContent className="border-white/10 bg-coal text-white">
              {["Playbooks", "Engineering", "Growth", "Makers", "Ecosystem"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Cover emoji">
          <Input value={f.coverEmoji} maxLength={4} onChange={(e) => setF({ ...f, coverEmoji: e.target.value })} className={inputCx} />
        </Field>
        <Field label="Tags (pipe-separated)">
          <Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} className={inputCx} placeholder="seo|growth" />
        </Field>
      </div>

      <div>
        <p className={labelCx}>Cover gradient</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {GRADIENTS.map((g) => (
            <button
              key={g}
              type="button"
              aria-label={`Gradient ${g}`}
              onClick={() => setF({ ...f, coverGradient: g })}
              className={cn(
                "size-8 rounded-lg bg-gradient-to-br transition-transform active:scale-90",
                g,
                f.coverGradient === g ? "ring-2 ring-ember ring-offset-2 ring-offset-coal" : "opacity-60 hover:opacity-100"
              )}
            />
          ))}
        </div>
      </div>

      {/* SEO panel */}
      <div className="rounded-xl border border-ember/25 bg-ember/[0.04] p-4">
        <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-ember uppercase">
          <BarChart3 className="size-3.5" aria-hidden /> SEO panel
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="SEO title (≤60 — falls back to title)">
            <Input value={f.seoTitle} maxLength={70} onChange={(e) => setF({ ...f, seoTitle: e.target.value })} className={inputCx} />
            <p className={cn("text-[10px]", seoTitle.length > 60 ? "text-red-400" : "text-white/30")}>
              {seoTitle.length}/60 {seoTitle.length > 60 && "— will truncate in SERP"}
            </p>
          </Field>
          <Field label="Keywords (comma-separated)">
            <Input value={f.keywords} onChange={(e) => setF({ ...f, keywords: e.target.value })} className={inputCx} placeholder="launch an ai tool, ai launch checklist" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="SEO description (≤160 — falls back to excerpt)">
              <Textarea value={f.seoDescription} rows={2} maxLength={170} onChange={(e) => setF({ ...f, seoDescription: e.target.value })} className={inputCx} />
              <p className={cn("text-[10px]", seoDesc.length > 160 ? "text-red-400" : "text-white/30")}>
                {seoDesc.length}/160
              </p>
            </Field>
          </div>
        </div>

        {/* SERP preview */}
        <div className="mt-3 rounded-lg border border-white/10 bg-coal p-3.5">
          <p className="font-mono text-[10px] tracking-widest text-white/30 uppercase">
            SERP preview
          </p>
          <p className="mt-1.5 truncate text-[11px] text-emerald-400/90">
            prother.dev › journal › {f.slug || "your-post-slug"}
          </p>
          <p className="mt-0.5 truncate text-base font-semibold text-white/90">
            {seoTitle || "Untitled post"}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-white/50">
            {seoDesc || "Write an excerpt that earns the click — it doubles as the meta description."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={busy || !f.title || (isNew && f.body.trim().length < 50)}
          onClick={() => void save()}
          className="rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          Save {f.status === "published" && !isNew ? "(published)" : "draft"}
        </Button>
        {f.status !== "published" && (
          <Button
            disabled={busy || !f.title || (isNew && f.body.trim().length < 50)}
            onClick={() => void save("published")}
            variant="outline"
            className="rounded-lg border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300"
          >
            <BadgeCheck className="size-4" aria-hidden />
            Publish now
          </Button>
        )}
        {f.status === "published" && !isNew && (
          <Button
            disabled={busy}
            onClick={() => void save("draft")}
            variant="outline"
            className="rounded-lg border-white/15 text-white/70 hover:bg-white/5"
          >
            <RotateCcw className="size-4" aria-hidden />
            Unpublish
          </Button>
        )}
        {!isNew && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => void remove()}
            className="ml-auto rounded-lg text-red-400 hover:bg-red-400/10 hover:text-red-300"
          >
            <Trash2 className="size-4" aria-hidden />
            Delete
          </Button>
        )}
        <Button variant="ghost" onClick={() => onDone()} className="rounded-lg text-white/60 hover:text-white">
          Cancel
        </Button>
      </div>
    </div>
  );
}

function BlogTab({
  apiKey,
  onChanged,
  onPreview,
}: {
  apiKey: string;
  onChanged: () => void;
  onPreview: (slug: string) => void;
}) {
  const { toast } = useToast();
  const [posts, setPosts] = useState<AdminPost[] | null>(null);
  const [editing, setEditing] = useState<PostDraft | null>(null);

  const load = useCallback(() => {
    adminFetch(apiKey, "/api/admin/posts")
      .then((r) => r.json())
      .then((d: { posts: AdminPost[] }) => setPosts(d.posts))
      .catch(() => toast({ title: "Posts unavailable", variant: "destructive" }));
  }, [apiKey, toast]);

  useEffect(load, [load]);

  if (editing) {
    return (
      <div className="max-h-[60vh] overflow-y-auto pr-1">
        <PostEditor
          apiKey={apiKey}
          draft={editing}
          onDone={(openSlug) => {
            setEditing(null);
            load();
            if (openSlug) onPreview(openSlug);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] tracking-wider text-white/35 uppercase">
          {posts?.length ?? "…"} posts · drafts never render publicly
        </p>
        <Button
          size="sm"
          onClick={() => setEditing({ ...EMPTY_POST })}
          className="rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
        >
          <Plus className="size-4" aria-hidden />
          New post
        </Button>
      </div>

      {posts === null && <Spinner />}
      <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
        {posts?.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5"
          >
            <span aria-hidden className="text-lg">{p.coverEmoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{p.title}</p>
              <p className="truncate font-mono text-[10px] text-white/40">
                /?post={p.slug} · {p.category} · {p.readingMinutes} min · {p.views} views
                {p.seoTitle || p.seoDescription || p.keywords ? " · SEO ✓" : " · SEO —"}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase",
                p.status === "published"
                  ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                  : "border border-white/15 bg-white/5 text-white/50"
              )}
            >
              {p.status}
            </span>
            {p.status === "published" && (
              <button
                type="button"
                onClick={() => onPreview(p.slug)}
                className="rounded-lg p-2 text-white/40 transition-colors hover:text-ember"
                aria-label={`Preview ${p.title}`}
              >
                <ExternalLink className="size-4" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setEditing({
                  id: p.id,
                  title: p.title,
                  slug: p.slug,
                  excerpt: p.excerpt,
                  body: "",
                  category: p.category,
                  tags: p.tags,
                  coverEmoji: p.coverEmoji,
                  coverGradient: p.coverGradient,
                  author: p.author,
                  status: p.status,
                  seoTitle: p.seoTitle ?? "",
                  seoDescription: p.seoDescription ?? "",
                  keywords: p.keywords ?? "",
                })
              }
              className="rounded-lg p-2 text-white/40 transition-colors hover:text-ember"
              aria-label={`Edit ${p.title}`}
            >
              <Pencil className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-white/25">
        METADATA-ONLY EDITS KEEP THE STORED MARKDOWN — REWRITE THE BODY FIELD TO
        REPLACE IT. READING TIME RECOMPUTES ON BODY SAVE.
      </p>
    </div>
  );
}

// ── Tab: Taxonomy ────────────────────────────────────────────────────────

function TaxonomyTab({ apiKey, onChanged }: { apiKey: string; onChanged: () => void }) {
  const { toast } = useToast();
  const [cats, setCats] = useState<
    { id: string; slug: string; name: string; emoji: string; sortOrder: number; toolCount: number }[]
  >([]);
  const [draft, setDraft] = useState({ slug: "", name: "", emoji: "🧪" });

  const load = useCallback(() => {
    adminFetch(apiKey, "/api/admin/categories")
      .then((r) => r.json())
      .then((d: { categories: typeof cats }) => setCats(d.categories))
      .catch(() => {});
  }, [apiKey]);
  useEffect(load, [load]);

  const save = useCallback(
    async (payload: { id?: string; slug: string; name: string; emoji: string }) => {
      try {
        const res = await adminFetch(apiKey, "/api/admin/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const d = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !d.ok) {
          toast({ title: d.error ?? "Save failed", variant: "destructive" });
          return false;
        }
        toast({ title: "Taxonomy updated" });
        load();
        onChanged();
        return true;
      } catch {
        toast({ title: "Network error", variant: "destructive" });
        return false;
      }
    },
    [apiKey, load, onChanged, toast]
  );

  const remove = useCallback(
    async (id: string, name: string, toolCount: number) => {
      if (toolCount > 0) {
        toast({
          title: "Can't delete",
          description: `${toolCount} tool${toolCount === 1 ? "" : "s"} still use ${name}.`,
          variant: "destructive",
        });
        return;
      }
      await adminFetch(apiKey, `/api/admin/categories?id=${id}`, { method: "DELETE" }).catch(
        () => {}
      );
      toast({ title: `${name} deleted` });
      load();
      onChanged();
    },
    [apiKey, load, onChanged, toast]
  );

  return (
    <div className="space-y-4">
      <div className="max-h-[44vh] space-y-2 overflow-y-auto pr-1">
        {cats.map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3"
          >
            <Input
              value={c.emoji}
              maxLength={4}
              aria-label="Emoji"
              onChange={(e) =>
                setCats((p) =>
                  p.map((x) => (x.id === c.id ? { ...x, emoji: e.target.value } : x))
                )
              }
              className="h-9 w-14 border border-white/10 bg-white/10 text-center text-base text-white"
            />
            <Input
              value={c.name}
              aria-label="Name"
              onChange={(e) =>
                setCats((p) =>
                  p.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x))
                )
              }
              className="min-w-40 flex-1 border-white/10 bg-white/5 text-sm text-white"
            />
            <span className="font-mono text-[10px] text-white/35">{c.slug}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/60">
              {c.toolCount} tools
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void save({ id: c.id, slug: c.slug, name: c.name, emoji: c.emoji })}
              className="h-8 rounded-lg border-white/15 text-white/70 hover:bg-white/5"
            >
              <Save className="size-3.5" aria-hidden />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void remove(c.id, c.name, c.toolCount)}
              className="h-8 rounded-lg text-red-400 hover:bg-red-400/10"
              aria-label={`Delete ${c.name}`}
            >
              <Trash2 className="size-3.5" aria-hidden />
            </Button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-white/15 p-4">
        <p className={labelCx}>New category</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Input
            value={draft.emoji}
            maxLength={4}
            onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
            aria-label="New category emoji"
            className="h-9 w-14 border border-white/10 bg-white/10 text-center text-base text-white"
          />
          <Input
            value={draft.name}
            onChange={(e) =>
              setDraft({
                ...draft,
                name: e.target.value,
                slug: e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-+|-+$/g, ""),
              })
            }
            placeholder="Name"
            className="min-w-40 flex-1 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/25"
          />
          <Input
            value={draft.slug}
            onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            placeholder="slug"
            className="w-40 border-white/10 bg-white/5 font-mono text-xs text-white placeholder:text-white/25"
          />
          <Button
            disabled={!draft.name || draft.name.length < 2}
            onClick={() => {
              void save(draft).then((ok) => {
                if (ok) setDraft({ slug: "", name: "", emoji: "🧪" });
              });
            }}
            className="rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
          >
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Subscribers ─────────────────────────────────────────────────────

function SubscribersTab({ apiKey }: { apiKey: string }) {
  const [data, setData] = useState<{
    total: number;
    confirmed: number;
    bySource: { source: string; count: number }[];
    rows: { email: string; source: string; confirmed: boolean; createdAt: string }[];
  } | null>(null);

  useEffect(() => {
    adminFetch(apiKey, "/api/admin/subscribers")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [apiKey]);

  if (!data) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={<Users className="size-3" aria-hidden />} label="Total" value={data.total.toLocaleString()} />
        <Kpi icon={<BadgeCheck className="size-3" aria-hidden />} label="Confirmed" value={data.confirmed.toLocaleString()} />
        {data.bySource.slice(0, 2).map((s) => (
          <Kpi key={s.source} icon={<Mail className="size-3" aria-hidden />} label={s.source} value={s.count.toLocaleString()} />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className={labelCx}>Latest {data.rows.length}</p>
        <a
          href={`/api/admin/subscribers?format=csv&key=${encodeURIComponent(apiKey)}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[11px] text-white/60 transition-colors hover:border-ember/40 hover:text-ember"
        >
          <Database className="size-3.5" aria-hidden /> Export CSV
        </a>
      </div>

      <div className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-white/10 p-2">
        {data.rows.map((r, i) => (
          <div
            key={`${r.email}-${i}`}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 font-mono text-xs hover:bg-white/[0.03]"
          >
            <span className="min-w-0 flex-1 truncate text-white/70">{r.email}</span>
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/45">{r.source}</span>
            <span className="w-24 shrink-0 text-right text-[10px] text-white/30">
              {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Settings ────────────────────────────────────────────────────────

const SETTING_FIELDS: { key: string; label: string; multiline?: boolean; hint?: string }[] = [
  { key: "hero.headline", label: "Hero headline", hint: "Last word renders in ember." },
  { key: "hero.subline", label: "Hero subline", multiline: true },
  { key: "hero.announcement", label: "Announcement pill" },
  { key: "footer.note", label: "Footer note" },
  { key: "seo.defaultTitle", label: "Default SEO title (≤60)" },
  { key: "seo.defaultDescription", label: "Default SEO description (≤160)", multiline: true },
];

function SettingsTab({ apiKey, onChanged }: { apiKey: string; onChanged: () => void }) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState({ key: "", value: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminFetch(apiKey, "/api/admin/settings")
      .then((r) => r.json())
      .then((d: { settings: Record<string, string> }) => setValues(d.settings))
      .catch(() => toast({ title: "Settings unavailable", variant: "destructive" }));
  }, [apiKey, toast]);
  useEffect(load, [load]);

  const save = async () => {
    setBusy(true);
    try {
      const payload: Record<string, string> = { ...values };
      if (extra.key && extra.value) payload[extra.key] = extra.value;
      const res = await adminFetch(apiKey, "/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ settings: payload }),
      });
      const d = (await res.json()) as { ok?: boolean; updated?: number };
      if (res.ok && d.ok) {
        toast({ title: "Site copy saved", description: `${d.updated} keys written — refresh to see it live.` });
        setExtra({ key: "", value: "" });
        load();
        onChanged();
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {SETTING_FIELDS.map((sf) => (
          <div key={sf.key} className={sf.multiline ? "sm:col-span-2" : ""}>
            <Field label={sf.label} hint={`${sf.key}${sf.hint ? ` · ${sf.hint}` : ""}`}>
              {sf.multiline ? (
                <Textarea
                  value={values[sf.key] ?? ""}
                  rows={2}
                  onChange={(e) => setValues({ ...values, [sf.key]: e.target.value })}
                  className={inputCx}
                />
              ) : (
                <Input
                  value={values[sf.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [sf.key]: e.target.value })}
                  className={inputCx}
                />
              )}
            </Field>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-white/15 p-4">
        <p className={labelCx}>Custom key / value</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Input
            value={extra.key}
            onChange={(e) => setExtra({ ...extra, key: e.target.value })}
            placeholder="e.g. og.imageNote"
            className="w-48 border-white/10 bg-white/5 font-mono text-xs text-white placeholder:text-white/25"
          />
          <Input
            value={extra.value}
            onChange={(e) => setExtra({ ...extra, value: e.target.value })}
            placeholder="value"
            className="flex-1 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/25"
          />
        </div>
      </div>

      <Button
        disabled={busy}
        onClick={() => void save()}
        className="rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
        Save site copy
      </Button>
    </div>
  );
}

// ── The console shell ────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "queue", label: "Queue", icon: ListChecks },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "listings", label: "Listings", icon: Database },
  { id: "blog", label: "Journal", icon: FileText },
  { id: "taxonomy", label: "Taxonomy", icon: Tags },
  { id: "subscribers", label: "Subscribers", icon: Users },
  { id: "settings", label: "Site copy", icon: SettingsIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminConsole() {
  const open = useExplorer((s) => s.adminOpen);
  const setOpen = useExplorer((s) => s.setAdminOpen);
  const setEditorOpen = useExplorer((s) => s.setEditorOpen);
  const openPost = useExplorer((s) => s.openPost);
  const { toast } = useToast();
  const { key, unlock, lock } = useAdminKey();
  const [tab, setTab] = useState<TabId>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);

  const bumpOverview = useCallback(() => {
    if (tab === "overview") {
      adminFetch(key ?? "", "/api/admin/overview")
        .then((r) => r.json())
        .then(setOverview)
        .catch(() => {});
    }
  }, [key, tab]);

  useEffect(() => {
    if (open && key && tab === "overview") void bumpOverview();
  }, [open, key, tab, bumpOverview]);

  // ⌘⇧A shortcut + #admin deep link.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    if (window.location.hash === "#admin") setOpen(true);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton
        className="flex max-h-[94vh] flex-col gap-0 overflow-hidden border-white/10 bg-coal p-0 text-white max-w-[calc(100vw-1rem)] sm:max-w-4xl"
      >
        <DialogTitle className="sr-only">Admin console</DialogTitle>
        <DialogDescription className="sr-only">
          Manage listings, the launch calendar, journal posts, taxonomy, subscribers,
          and site copy.
        </DialogDescription>

        {!key ? (
          <Gate onUnlock={unlock} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            {/* tab rail */}
            <nav
              aria-label="Admin sections"
              className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 p-2 sm:w-48 sm:flex-col sm:overflow-y-auto sm:border-r sm:border-b-0 sm:p-3"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? "true" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    tab === t.id
                      ? "bg-ember/15 text-ember"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <t.icon className="size-4 shrink-0" aria-hidden />
                  <span className="whitespace-nowrap">{t.label}</span>
                  {t.id === "queue" && (overview?.kpis.pendingSubs ?? 0) > 0 && (
                    <span className="ml-auto rounded-full bg-ember px-1.5 font-mono text-[9px] text-black">
                      {overview?.kpis.pendingSubs}
                    </span>
                  )}
                </button>
              ))}
              <div className="mt-auto hidden gap-1 sm:flex sm:flex-col">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setEditorOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <ShieldCheck className="size-3.5" aria-hidden />
                  Full review desk
                </button>
                <button
                  type="button"
                  onClick={() => {
                    lock();
                    toast({ title: "Locked", description: "Admin session ended." });
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <KeyRound className="size-3.5" aria-hidden />
                  Lock console
                </button>
              </div>
            </nav>

            {/* tab content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <p className="font-mono text-[10px] tracking-[0.25em] text-ember uppercase">
                PROTHER ADMIN
              </p>
              <h2 className="mt-1 mb-4 text-xl font-black tracking-tight">
                {TABS.find((t) => t.id === tab)?.label}
              </h2>

              {tab === "overview" &&
                (overview ? (
                  <OverviewTab data={overview} />
                ) : (
                  <Spinner />
                ))}
              {tab === "queue" && (
                <QueueTab apiKey={key} onChanged={bumpOverview} />
              )}
              {tab === "calendar" && (
                <CalendarTab apiKey={key} onChanged={bumpOverview} />
              )}
              {tab === "listings" && (
                <ListingsTab apiKey={key} onChanged={bumpOverview} />
              )}
              {tab === "blog" && (
                <BlogTab
                  apiKey={key}
                  onChanged={bumpOverview}
                  onPreview={(slug) => {
                    setOpen(false);
                    openPost(slug);
                  }}
                />
              )}
              {tab === "taxonomy" && (
                <TaxonomyTab apiKey={key} onChanged={bumpOverview} />
              )}
              {tab === "subscribers" && <SubscribersTab apiKey={key} />}
              {tab === "settings" && (
                <SettingsTab apiKey={key} onChanged={bumpOverview} />
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
