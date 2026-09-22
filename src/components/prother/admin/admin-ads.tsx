"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Megaphone, Pause, Pencil, Play, Plus, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  adminFetch,
  Field,
  inputCx,
  LoadError,
  MiniStat,
} from "./admin-shared";

/**
 * Admin — Advertising module (Task 23-b).
 * Sponsored campaigns: stats strip, flight/budget/performance columns,
 * status management (select + quick activate/pause), create & edit dialog
 * and a two-step delete. POST validates clickUrl with new URL(); the API
 * re-validates and 400s are surfaced verbatim.
 */

type Placement =
  | "journal_bar"
  | "category_spotlight"
  | "directory_banner"
  | "serp_footer";
type CampaignStatus = "draft" | "active" | "paused" | "ended";
type WindowState = "scheduled" | "running" | "finished" | "none";

type AdCampaign = {
  id: string;
  name: string;
  advertiser: string;
  placement: Placement;
  status: CampaignStatus;
  headline: string;
  body: string | null;
  clickUrl: string;
  emoji: string | null;
  gradient: string | null;
  targetCategory: string | null;
  weight: number;
  startsAt: string | null;
  endsAt: string | null;
  totalBudgetCents: number | null;
  dailyBudgetCents: number | null;
  impressions: number;
  clicks: number;
  viewableImpressions: number;
  ctr: number;
  vRate: number;
  windowState: WindowState;
};

type AdsStats = { total: number; active: number; impressions: number; clicks: number; ctr: number };

type PlacementMeasurement = {
  placement: Placement;
  served: number;
  house: number;
  unfilled: number;
  unfillRate: number;
};

type Measurement = {
  days: { day: string; date: string }[];
  perPlacement: PlacementMeasurement[];
};

const PLACEMENTS: { value: Placement; label: string }[] = [
  { value: "directory_banner", label: "Directory banner" },
  { value: "journal_bar", label: "Journal bar" },
  { value: "category_spotlight", label: "Category spotlight" },
  { value: "serp_footer", label: "SERP footer" },
];

const STATUSES: CampaignStatus[] = ["draft", "active", "paused", "ended"];

const PLACEMENT_LABEL: Record<Placement, string> = {
  directory_banner: "Directory banner",
  journal_bar: "Journal bar",
  category_spotlight: "Category spotlight",
  serp_footer: "SERP footer",
};

function urlOk(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const fmtCtr = (ctr: number) => `${ctr.toFixed(1)}%`;

function fmtMoney(cents: number | null | undefined): string {
  if (!cents || cents <= 0) return "no cap";
  const dollars = cents / 100;
  return `$${dollars % 1 === 0 ? dollars.toLocaleString("en-US") : dollars.toFixed(2)} cap`;
}

function fmtWindow(c: AdCampaign): string {
  const s = c.startsAt ? c.startsAt.slice(0, 10) : "—";
  const e = c.endsAt ? c.endsAt.slice(0, 10) : "—";
  return `${s} → ${e}`;
}

const WINDOW_CX: Record<WindowState, string> = {
  running: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  scheduled: "border-white/15 bg-white/5 text-white/50",
  finished: "border-white/10 bg-white/[0.03] text-white/30",
  none: "border-white/10 bg-white/[0.03] text-white/30",
};

function CampaignsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[86px] rounded-xl bg-white/[0.04]" />
      ))}
    </div>
  );
}

// ── Create / edit dialog ─────────────────────────────────────────────────

type CampaignForm = {
  name: string;
  advertiser: string;
  placement: Placement;
  status: CampaignStatus;
  headline: string;
  body: string;
  clickUrl: string;
  emoji: string;
  weight: string;
  startsAt: string;
  endsAt: string;
  totalBudgetCents: string;
  dailyBudgetCents: string;
};

function formFromCampaign(c: AdCampaign | null): CampaignForm {
  return {
    name: c?.name ?? "",
    advertiser: c?.advertiser ?? "",
    placement: c?.placement ?? "directory_banner",
    status: c?.status ?? "draft",
    headline: c?.headline ?? "",
    body: c?.body ?? "",
    clickUrl: c?.clickUrl ?? "",
    emoji: c?.emoji ?? "",
    weight: String(c?.weight ?? 5),
    startsAt: c?.startsAt ? c.startsAt.slice(0, 10) : "",
    endsAt: c?.endsAt ? c.endsAt.slice(0, 10) : "",
    totalBudgetCents: c?.totalBudgetCents ? String(c.totalBudgetCents) : "",
    dailyBudgetCents: c?.dailyBudgetCents ? String(c.dailyBudgetCents) : "",
  };
}

function CampaignDialog({
  apiKey,
  campaign,
  onDone,
}: {
  apiKey: string;
  campaign: AdCampaign | null;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [f, setF] = useState<CampaignForm>(() => formFromCampaign(campaign));
  const [busy, setBusy] = useState(false);
  const isNew = !campaign;

  const weightNum = Math.round(Number(f.weight));
  const valid =
    f.name.trim().length > 0 &&
    f.advertiser.trim().length > 0 &&
    f.headline.trim().length > 0 &&
    urlOk(f.clickUrl) &&
    weightNum >= 1 &&
    weightNum <= 10;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const payload = {
        name: f.name.trim(),
        advertiser: f.advertiser.trim(),
        placement: f.placement,
        status: f.status,
        headline: f.headline.trim(),
        body: f.body.trim() || undefined,
        clickUrl: f.clickUrl.trim(),
        emoji: f.emoji.trim() || undefined,
        weight: weightNum,
        startsAt: f.startsAt ? new Date(`${f.startsAt}T00:00:00.000Z`).toISOString() : undefined,
        endsAt: f.endsAt ? new Date(`${f.endsAt}T00:00:00.000Z`).toISOString() : undefined,
        totalBudgetCents: f.totalBudgetCents.trim()
          ? Math.max(0, Math.round(Number(f.totalBudgetCents)))
          : undefined,
        dailyBudgetCents: f.dailyBudgetCents.trim()
          ? Math.max(0, Math.round(Number(f.dailyBudgetCents)))
          : undefined,
      };
      const res = await adminFetch(
        apiKey,
        isNew ? "/api/admin/ads" : `/api/admin/ads/${campaign.id}`,
        { method: isNew ? "POST" : "PATCH", body: JSON.stringify(payload) }
      );
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) {
        toast({ title: d.error ?? "Save failed", variant: "destructive" });
        return;
      }
      toast({
        title: isNew ? "Campaign created" : "Campaign saved",
        description: `${f.name.trim()} · ${f.status}`,
      });
      onDone();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent
        className="max-h-[92vh] gap-0 overflow-y-auto border-white/10 bg-coal p-0 text-white sm:max-w-xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="border-b border-white/10 p-5 text-left">
          <DialogTitle className="text-lg font-black tracking-tight">
            {isNew ? "New campaign" : `Edit — ${campaign.name}`}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-white/50">
            Sponsored slots across the directory, journal, category and search
            pages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Campaign name">
              <Input
                value={f.name}
                maxLength={80}
                onChange={(e) => setF({ ...f, name: e.target.value })}
                placeholder="Directory banner — spring campaign"
                className={inputCx}
              />
            </Field>
            <Field label="Advertiser">
              <Input
                value={f.advertiser}
                maxLength={60}
                onChange={(e) => setF({ ...f, advertiser: e.target.value })}
                placeholder="IndieShip"
                className={inputCx}
              />
            </Field>
            <Field label="Placement">
              <Select
                value={f.placement}
                onValueChange={(v) => setF({ ...f, placement: v as Placement })}
              >
                <SelectTrigger className={inputCx}><SelectValue /></SelectTrigger>
                <SelectContent className="border-white/10 bg-coal text-white">
                  {PLACEMENTS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={f.status}
                onValueChange={(v) => setF({ ...f, status: v as CampaignStatus })}
              >
                <SelectTrigger className={inputCx}><SelectValue /></SelectTrigger>
                <SelectContent className="border-white/10 bg-coal text-white">
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Headline (shown on the placement)">
            <Input
              value={f.headline}
              maxLength={90}
              onChange={(e) => setF({ ...f, headline: e.target.value })}
              placeholder="Ship AI features without the plumbing"
              className={inputCx}
            />
          </Field>
          <Field label="Body (secondary line)">
            <Textarea
              value={f.body}
              rows={2}
              maxLength={140}
              onChange={(e) => setF({ ...f, body: e.target.value })}
              placeholder="One supporting sentence — optional."
              className={inputCx}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Click URL">
              <Input
                value={f.clickUrl}
                type="url"
                onChange={(e) => setF({ ...f, clickUrl: e.target.value })}
                placeholder="https://example.com/?utm_source=prother"
                className={cn(inputCx, "font-mono text-xs")}
              />
              {f.clickUrl.trim() && !urlOk(f.clickUrl) && (
                <p className="text-[10px] text-red-400">Not a valid http(s) URL</p>
              )}
            </Field>
            <Field label="Emoji">
              <Input
                value={f.emoji}
                maxLength={4}
                onChange={(e) => setF({ ...f, emoji: e.target.value })}
                placeholder="🧭"
                className={inputCx}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Weight (1–10)">
              <Input
                value={f.weight}
                type="number"
                min={1}
                max={10}
                onChange={(e) => setF({ ...f, weight: e.target.value })}
                className={inputCx}
              />
              {!Number.isNaN(weightNum) && (weightNum < 1 || weightNum > 10) && (
                <p className="text-[10px] text-red-400">Pick 1–10 — higher wins the slot</p>
              )}
            </Field>
            <Field label="Starts (UTC)">
              <Input
                value={f.startsAt}
                type="date"
                onChange={(e) => setF({ ...f, startsAt: e.target.value })}
                className={cn(inputCx, "[color-scheme:dark]")}
              />
            </Field>
            <Field label="Ends (UTC)">
              <Input
                value={f.endsAt}
                type="date"
                onChange={(e) => setF({ ...f, endsAt: e.target.value })}
                className={cn(inputCx, "[color-scheme:dark]")}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Total budget (cents)" hint="Blank = no cap">
              <Input
                value={f.totalBudgetCents}
                type="number"
                min={0}
                onChange={(e) => setF({ ...f, totalBudgetCents: e.target.value })}
                placeholder="50000"
                className={inputCx}
              />
            </Field>
            <Field label="Daily budget (cents)" hint="Blank = no cap">
              <Input
                value={f.dailyBudgetCents}
                type="number"
                min={0}
                onChange={(e) => setF({ ...f, dailyBudgetCents: e.target.value })}
                placeholder="5000"
                className={inputCx}
              />
            </Field>
          </div>

          <div className="flex items-center gap-2 border-t border-white/10 pt-4">
            <Button
              disabled={!valid || busy}
              onClick={() => void submit()}
              className="rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
            >
              <Plus className="size-4" aria-hidden />
              {isNew ? "Create campaign" : "Save changes"}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => onDone()}
              className="rounded-lg text-white/60 hover:text-white"
            >
              Cancel
            </Button>
            {!valid && (
              <p className="hidden font-mono text-[10px] text-white/30 sm:block">
                NAME · ADVERTISER · HEADLINE · VALID URL · WEIGHT 1–10 REQUIRED
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Serving controls (Task 27) ─────────────────────────────────────────

const SERVING_MASTER_KEY = "ads.master";
const servingPlacementKey = (p: Placement) => `ads.placement.${p}`;

/**
 * Live kill switches, backed by the SiteSetting KV via /api/admin/settings —
 * the same keys /api/ads/serve reads before counting an impression. Flipping
 * one takes effect on the next slot request, no deploy. When a placement is
 * off, pages don't even mount the client island (zero ad JS).
 */
function ServingControls({ apiKey }: { apiKey: string }) {
  const { toast } = useToast();
  const [config, setConfig] = useState<{
    master: boolean;
    placements: Record<Placement, boolean>;
  } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    adminFetch(apiKey, "/api/admin/settings")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ settings?: Record<string, string> }>;
      })
      .then((d) => {
        if (!alive) return;
        const s = d.settings ?? {};
        setConfig({
          master: s[SERVING_MASTER_KEY] !== "0",
          placements: Object.fromEntries(
            PLACEMENTS.map((p) => [p.value, s[servingPlacementKey(p.value)] !== "0"])
          ) as Record<Placement, boolean>,
        });
      })
      .catch(() => {
        if (!alive) return;
        setConfig({
          master: true,
          placements: Object.fromEntries(
            PLACEMENTS.map((p) => [p.value, true])
          ) as Record<Placement, boolean>,
        });
      });
    return () => {
      alive = false;
    };
  }, [apiKey]);

  const put = useCallback(
    async (key: string, on: boolean, label: string) => {
      setBusyKey(key);
      try {
        const res = await adminFetch(apiKey, "/api/admin/settings", {
          method: "PUT",
          body: JSON.stringify({ key, value: on ? "1" : "0" }),
        });
        const d = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !d.ok) throw new Error(d.error ?? "Save failed");
        setConfig((cur) =>
          !cur
            ? cur
            : key === SERVING_MASTER_KEY
              ? { ...cur, master: on }
              : {
                  ...cur,
                  placements: {
                    ...cur.placements,
                    [key.slice("ads.placement.".length) as Placement]: on,
                  },
                }
        );
        toast({
          title: `${label} ${on ? "enabled" : "disabled"}`,
          description: on ? undefined : "Slots render nothing while off.",
        });
      } catch (err) {
        toast({
          title: err instanceof Error ? err.message : "Network error",
          variant: "destructive",
        });
      } finally {
        setBusyKey(null);
      }
    },
    [apiKey, toast]
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">Serving controls</p>
          <p className="text-xs text-white/45">
            Live kill switches — no deploy. Off slots render nothing and spend no
            impressions.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Power
            className={cn("size-4", config?.master ? "text-ember" : "text-white/30")}
            aria-hidden
          />
          <Switch
            checked={config?.master ?? false}
            disabled={!config || busyKey === SERVING_MASTER_KEY}
            onCheckedChange={(v) => void put(SERVING_MASTER_KEY, v, "All ad serving")}
            aria-label="Master ad serving switch"
          />
        </div>
      </div>

      <div className="mt-3 grid gap-1.5 border-t border-white/10 pt-3 sm:grid-cols-2">
        {PLACEMENTS.map((p) => (
          <div
            key={p.value}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
          >
            <span className="min-w-0">
              <span className="block truncate font-mono text-[11px] tracking-wider text-white/70 uppercase">
                {p.label}
              </span>
              <span className="block truncate font-mono text-[9px] text-white/30">
                {p.value}
              </span>
            </span>
            <Switch
              checked={config?.placements[p.value] ?? false}
              disabled={!config || busyKey === servingPlacementKey(p.value)}
              onCheckedChange={(v) =>
                void put(servingPlacementKey(p.value), v, p.label)
              }
              aria-label={`Serve ${p.label} placement`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Measurement (Task 28, P4) ──────────────────────────────────────────

/**
 * 7-day fill accounting per placement, read from the same GET as the
 * campaign list (measurement field). "Unfill" = requested slots that did
 * NOT yield a direct-sold campaign — house fills included, since the slot
 * was requested and no advertiser paid for it. That number is the sales
 * pitch: it is the inventory currently going out at $0.
 */
function MeasurementCard({ m }: { m: Measurement | null }) {
  const maxServed = m
    ? Math.max(1, ...m.perPlacement.map((p) => p.served))
    : 1;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">Measurement — 7-day fill</p>
          <p className="text-xs text-white/45">
            Served vs. unsold demand per placement. Unfill = no campaign (house fills
            included) — that gap is open selling inventory.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 font-mono text-[9px] tracking-wider text-white/40 uppercase">
          {m ? `${m.days[0]?.day} → ${m.days[m.days.length - 1]?.day}` : "…"}
        </span>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
        {(m?.perPlacement ?? PLACEMENTS.map((p) => ({
          placement: p.value,
          served: 0,
          house: 0,
          unfilled: 0,
          unfillRate: 0,
        }))).map((row) => {
          const label =
            PLACEMENTS.find((p) => p.value === row.placement)?.label ?? row.placement;
          const requested = row.served + row.house + row.unfilled;
          return (
            <div
              key={row.placement}
              className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
            >
              <span className="w-28 shrink-0 truncate font-mono text-[11px] tracking-wider text-white/70 uppercase">
                {label}
              </span>
              <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums text-white">
                {row.served.toLocaleString("en-US")}
                <span className="ml-1 text-white/35">imp</span>
              </span>
              <span className="hidden w-14 shrink-0 text-right font-mono text-[11px] tabular-nums text-white/45 sm:block">
                {row.house} hs
              </span>
              <span className="hidden w-14 shrink-0 text-right font-mono text-[11px] tabular-nums text-white/45 sm:block">
                {row.unfilled} un
              </span>
              {/* served share bar + unfill rate readout */}
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  aria-hidden
                  className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10"
                >
                  <span
                    className="block h-full rounded-full bg-ember transition-all"
                    style={{ width: `${Math.round((row.served / maxServed) * 100)}%` }}
                  />
                </span>
                <span
                  className={cn(
                    "w-16 shrink-0 text-right font-mono text-[10px] tabular-nums",
                    requested === 0
                      ? "text-white/30"
                      : row.unfillRate >= 50
                        ? "text-amber-400"
                        : "text-emerald-400"
                  )}
                  title="Unfill rate — (house + unfilled) / requested"
                >
                  {requested === 0 ? "—" : `${row.unfillRate}% unfill`}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 font-mono text-[10px] leading-relaxed text-white/25">
        VIEWABILITY (VW) IS COUNTED MRC-STYLE — ≥50% OF THE CREATIVE ON SCREEN FOR ≥1S —
        PER CAMPAIGN BELOW · DISABLED SLOTS COUNT NOTHING (AN OFF SWITCH IS NOT A FILL)
      </p>
    </div>
  );
}

// ── Ads tab ──────────────────────────────────────────────────────────────

export function AdsTab({ apiKey, onChanged }: { apiKey: string; onChanged: () => void }) {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<AdCampaign[] | null>(null);
  const [stats, setStats] = useState<AdsStats | null>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; campaign: AdCampaign | null }>({
    open: false,
    campaign: null,
  });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    adminFetch(apiKey, "/api/admin/ads")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{
          campaigns: AdCampaign[];
          stats: AdsStats;
          measurement?: Measurement;
        }>;
      })
      .then((d) => {
        setCampaigns(d.campaigns);
        setStats(d.stats);
        setMeasurement(d.measurement ?? null);
        setError(false);
      })
      .catch(() => setError(true));
  }, [apiKey]);

  useEffect(load, [load]);

  const retry = useCallback(() => {
    setCampaigns(null);
    setError(false);
    load();
  }, [load]);

  const patchStatus = useCallback(
    async (c: AdCampaign, nextStatus: CampaignStatus, note?: string) => {
      const snapshot = campaigns;
      setCampaigns((cur) =>
        cur?.map((x) => (x.id === c.id ? { ...x, status: nextStatus } : x)) ?? cur
      );
      setBusy(c.id);
      try {
        const res = await adminFetch(apiKey, `/api/admin/ads/${c.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        });
        const d = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !d.ok) throw new Error(d.error ?? "Status update failed");
        toast({ title: `${c.name} → ${nextStatus}`, description: note });
        onChanged();
      } catch (err) {
        setCampaigns(snapshot);
        toast({
          title: err instanceof Error ? err.message : "Network error",
          variant: "destructive",
        });
      } finally {
        setBusy(null);
      }
    },
    [apiKey, campaigns, toast, onChanged]
  );

  const doDelete = useCallback(
    async (c: AdCampaign) => {
      setBusy(c.id);
      try {
        const res = await adminFetch(apiKey, `/api/admin/ads/${c.id}`, { method: "DELETE" });
        const d = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !d.ok) throw new Error(d.error ?? "Delete failed");
        toast({ title: `${c.name} deleted` });
        setCampaigns((cur) => cur?.filter((x) => x.id !== c.id) ?? cur);
        onChanged();
      } catch (err) {
        toast({
          title: err instanceof Error ? err.message : "Network error",
          variant: "destructive",
        });
      } finally {
        setBusy(null);
      }
    },
    [apiKey, toast, onChanged]
  );

  const onDeleteClick = useCallback(
    (c: AdCampaign) => {
      if (confirmDelete === c.id) {
        if (deleteTimer.current) clearTimeout(deleteTimer.current);
        setConfirmDelete(null);
        void doDelete(c);
      } else {
        setConfirmDelete(c.id);
        if (deleteTimer.current) clearTimeout(deleteTimer.current);
        deleteTimer.current = setTimeout(() => setConfirmDelete(null), 3000);
      }
    },
    [confirmDelete, doDelete]
  );

  return (
    <div className="space-y-3">
      {/* stats strip */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MiniStat label="Active campaigns" value={stats ? `${stats.active}/${stats.total}` : "…"} />
        <MiniStat label="Impressions" value={stats?.impressions ?? "…"} />
        <MiniStat label="Clicks" value={stats?.clicks ?? "…"} />
        <MiniStat label="Avg CTR" value={stats ? fmtCtr(stats.ctr) : "…"} accent />
      </div>

      {/* serving controls — master + per-placement kill switches (Task 27) */}
      <ServingControls apiKey={apiKey} />

      {/* 7-day fill/unfill accounting per placement (Task 28) */}
      <MeasurementCard m={measurement} />

      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] tracking-wider text-white/35 uppercase">
          {campaigns ? `${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}` : "…"} ·
          weight picks the slot winner
        </p>
        <Button
          size="sm"
          onClick={() => setDialog({ open: true, campaign: null })}
          className="rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
        >
          <Plus className="size-4" aria-hidden />
          New campaign
        </Button>
      </div>

      {error ? (
        <LoadError label="Campaigns" onRetry={retry} />
      ) : campaigns === null ? (
        <CampaignsSkeleton />
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
          <Megaphone className="mx-auto size-8 text-white/25" aria-hidden />
          <p className="mt-3 font-mono text-sm text-white/60">
            No campaigns yet — create the first one
          </p>
          <Button
            onClick={() => setDialog({ open: true, campaign: null })}
            className="mt-4 rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot dark:text-black"
          >
            <Plus className="size-4" aria-hidden />
            New campaign
          </Button>
        </div>
      ) : (
        <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span aria-hidden className="text-lg">
                  {c.emoji || "📢"}
                </span>
                <div className="min-w-44 flex-1">
                  <p className="truncate text-sm font-bold text-white">{c.name}</p>
                  <p className="truncate text-xs text-white/45">{c.headline}</p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[9px] tracking-wider text-white/60 uppercase">
                    {PLACEMENT_LABEL[c.placement]}
                  </span>
                  {c.windowState !== "none" && (
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-wider uppercase",
                        WINDOW_CX[c.windowState]
                      )}
                    >
                      {c.windowState}
                    </span>
                  )}
                  {c.targetCategory && (
                    <span
                      title={`Category spotlight: ${c.targetCategory}`}
                      className="rounded-full border border-ember/30 bg-ember/10 px-2 py-0.5 font-mono text-[9px] tracking-wider text-ember"
                    >
                      → {c.targetCategory}
                    </span>
                  )}
                </div>

                <div className="hidden shrink-0 text-right font-mono text-[10px] leading-relaxed text-white/40 lg:block">
                  <p>{fmtWindow(c)}</p>
                  <p>
                    {fmtMoney(c.totalBudgetCents)}
                    {c.dailyBudgetCents && c.dailyBudgetCents > 0
                      ? ` · $${(c.dailyBudgetCents / 100).toLocaleString("en-US")}/day`
                      : ""}
                  </p>
                </div>

                <div className="hidden shrink-0 text-right font-mono text-[10px] leading-relaxed text-white/50 sm:block">
                  <p>
                    {c.impressions.toLocaleString("en-US")} imp
                    {c.impressions > 0 && (
                      <span className="text-white/30">
                        {" "}· {Math.round(c.vRate)}% vw
                      </span>
                    )}
                  </p>
                  <p>
                    {c.clicks.toLocaleString("en-US")} clk ·{" "}
                    <span className="text-ember">{fmtCtr(c.ctr)}</span>
                  </p>
                </div>

                <Select
                  value={c.status}
                  onValueChange={(v) => void patchStatus(c, v as CampaignStatus)}
                  disabled={busy === c.id}
                >
                  <SelectTrigger
                    aria-label={`Status for ${c.name}`}
                    className={cn(inputCx, "h-8 w-28 shrink-0 text-xs")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-coal text-white">
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex shrink-0 items-center gap-1">
                  {c.status === "active" ? (
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={busy === c.id}
                      onClick={() => void patchStatus(c, "paused")}
                      aria-label={`Pause ${c.name}`}
                      title="Pause"
                      className="size-8 rounded-lg border-white/15 text-white/70 hover:bg-white/5"
                    >
                      <Pause className="size-3.5" aria-hidden />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={busy === c.id}
                      onClick={() =>
                        void patchStatus(c, "active", "Serves only inside the flight window.")
                      }
                      aria-label={`Activate ${c.name}`}
                      title="Activate"
                      className="size-8 rounded-lg border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300"
                    >
                      <Play className="size-3.5" aria-hidden />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={busy === c.id}
                    onClick={() => setDialog({ open: true, campaign: c })}
                    aria-label={`Edit ${c.name}`}
                    className="size-8 rounded-lg text-white/40 hover:text-ember"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === c.id}
                    onClick={() => onDeleteClick(c)}
                    aria-label={
                      confirmDelete === c.id ? `Confirm delete ${c.name}` : `Delete ${c.name}`
                    }
                    className={cn(
                      "h-8 rounded-lg font-mono text-[10px] tracking-wider uppercase",
                      confirmDelete === c.id
                        ? "bg-red-500/15 text-red-300 hover:bg-red-500/25"
                        : "text-red-400/70 hover:bg-red-400/10 hover:text-red-300"
                    )}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    {confirmDelete === c.id ? "Sure?" : ""}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="font-mono text-[10px] leading-relaxed text-white/25">
        IMPRESSIONS &amp; CLICKS COUNT THROUGH THE PUBLIC /API/ADS ENDPOINTS ·
        DELETE IS TWO-CLICK CONFIRM (CLICK AGAIN WITHIN 3S) · FLIGHT DATES ARE UTC
      </p>

      {dialog.open && (
        <CampaignDialog
          apiKey={apiKey}
          campaign={dialog.campaign}
          onDone={() => {
            setDialog({ open: false, campaign: null });
            load();
            onChanged();
          }}
        />
      )}
    </div>
  );
}
