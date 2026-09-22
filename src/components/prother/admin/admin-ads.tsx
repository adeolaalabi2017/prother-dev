"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Megaphone, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
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

type Placement = "feed_row" | "journal_bar" | "category_spotlight";
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
  ctr: number;
  windowState: WindowState;
};

type AdsStats = { total: number; active: number; impressions: number; clicks: number; ctr: number };

const PLACEMENTS: { value: Placement; label: string }[] = [
  { value: "feed_row", label: "Feed row" },
  { value: "journal_bar", label: "Journal bar" },
  { value: "category_spotlight", label: "Category spotlight" },
];

const STATUSES: CampaignStatus[] = ["draft", "active", "paused", "ended"];

const PLACEMENT_LABEL: Record<Placement, string> = {
  feed_row: "Feed row",
  journal_bar: "Journal bar",
  category_spotlight: "Spotlight",
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
    placement: c?.placement ?? "feed_row",
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
            Sponsored slots across the feed, journal and category pages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Campaign name">
              <Input
                value={f.name}
                maxLength={80}
                onChange={(e) => setF({ ...f, name: e.target.value })}
                placeholder="Launch Week sponsorship"
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

// ── Ads tab ──────────────────────────────────────────────────────────────

export function AdsTab({ apiKey, onChanged }: { apiKey: string; onChanged: () => void }) {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<AdCampaign[] | null>(null);
  const [stats, setStats] = useState<AdsStats | null>(null);
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
        return r.json() as Promise<{ campaigns: AdCampaign[]; stats: AdsStats }>;
      })
      .then((d) => {
        setCampaigns(d.campaigns);
        setStats(d.stats);
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
                  <p>{c.impressions.toLocaleString("en-US")} imp</p>
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
