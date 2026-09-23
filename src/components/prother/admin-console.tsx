"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Database,
  ExternalLink,
  FileText,
  Flag,
  Hexagon,
  Images,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Mail,
  Megaphone,
  Menu,
  Pencil,
  Pin,
  Plus,
  RotateCcw,
  Save,
  Scale,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Star,
  Tags,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { STANDARD_DEFS } from "@/lib/standards";
import {
  DEMO_HINT,
  adminFetch,
  inputCx,
  labelCx,
  Field,
  Panel,
  Spinner,
  useAdminKey,
} from "./admin/admin-shared";
import { UsersTab } from "./admin/admin-users";
import { ReportsTab } from "./admin/admin-reports";
import { AdsTab } from "./admin/admin-ads";
import { AdminMediaTab } from "./admin/admin-media";
import { IntegrationsModule } from "./admin/admin-integrations";
import { ImageUploadField } from "./image-upload-field";

/**
 * Admin Console — /admin route (Task 20-c redesign).
 * Sidebar dashboard shell per the admin design reference: logo + jump-to
 * search + grouped nav + promo card on the left; big section title, key
 * status chip and lock action up top; overview mirrors the reference's
 * KPI-stat row → charts row → data-table row layout.
 *
 * Everything is painted with Prother tokens ONLY (ink/coal panels,
 * white/10 borders, rounded-2xl, ember #FF6A00 as the single accent,
 * cream text moments, mono micro-labels) — semantic green/red appear
 * only in positive/negative delta pills, as elsewhere on the site.
 * Demo key auth (`x-editor-key`) shared with the editor desk; NextAuth P2.
 */

// ── shared helpers live in ./admin/admin-shared.tsx (Task 23-b split) ─────

// ── Gate (locked state) ──────────────────────────────────────────────────

function Gate({ onUnlock }: { onUnlock: (key: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex min-h-[68vh] items-center justify-center px-1 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-coal p-6 text-center shadow-2xl shadow-black/50 sm:p-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl border border-ember/30 bg-ember/10">
          <KeyRound className="size-5 text-ember" aria-hidden />
        </div>
        <p className="mt-4 font-mono text-xs tracking-[0.3em] text-ember uppercase">
          Restricted
        </p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-white">
          Enter the backstage
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          Listings, journal, taxonomy and site copy: one key,
          no deploys. Demo key:{" "}
          <button
            type="button"
            onClick={() => setValue(DEMO_HINT)}
            className="font-mono text-ember underline-offset-2 hover:underline"
          >
            {DEMO_HINT}
          </button>
        </p>
        <form
          className="mt-6 space-y-2.5"
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
            className="w-full rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal"
          >
            Unlock console
          </Button>
        </form>
        <p className="mt-5 font-mono text-xs leading-relaxed tracking-wider text-white/55 uppercase">
          Key lives in this tab&apos;s session only · sent as x-editor-key
        </p>
      </div>
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────────────

type Overview = {
  kpis: {
    toolsLive: number;
    pendingSubs: number;
    postsPublished: number;
    comments: number;
    reviewsPublished: number;
    reportsOpen: number;
    adsActive: number;
    adImpressions: number;
    adClicks: number;
    pageviewsToday: number;
    categories: number;
  };
  listingsByDay: number[];
  reviewsByDay: number[];
  categoryMix: { name: string; count: number }[];
  pricingMix: { model: string; count: number }[];
  queueAgeH: number;
  oldestPending: string | null;
  audit: {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    meta: string;
    at: string;
  }[];
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
  /** Comparison-matrix values (Task 32): {"Context window":"128k tokens"}. */
  features: Record<string, string>;
  /** Uploaded media (Task 34): POST-boot columns read via raw SQL server-side. */
  logoUrl: string | null;
  screenshotUrls: string[];
  /** Editorial content (Task 35): rich listing copy, merged server-side via
   *  lib/tool-editorial.ts (raw SQL per the stale-PrismaClient rule). */
  longDescription: string | null;
  useCases: { title: string; body: string }[];
  pros: string[];
  cons: string[];
  alternatives: string[];
  pricingCheckedAt: string | null;
  contentUpdatedAt: string | null;
  category: { id: string; name: string; emoji: string; slug: string };
  comments: number;
  reviews: number;
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
  /** Uploaded cover (Task 34): POST-boot column merged into the payload server-side. */
  coverUrl: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

// ── Section: Submissions (moderation queue) ──────────────────────────────

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
          title: decision === "approve" ? "Listing approved" : "Rejected",
          description:
            decision === "approve"
              ? "Now live in the directory."
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
            Queue clear. Nothing waiting.
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
            <span className="hidden shrink-0 font-mono text-xs text-white/60 sm:block">
              {s.domain} · {s.ageH}h
            </span>
          </div>

          {rejecting === s.id ? (
            <div className="mt-3 space-y-2.5 rounded-lg border border-red-400/25 bg-red-400/[0.05] p-3">
              <p className="font-mono text-xs tracking-widest text-red-300">
                REJECTIONS MUST CITE FAILED STANDARD(S)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STANDARD_DEFS.map((sd) => {
                  const on = failed.includes(sd.id);
                  return (
                    <label
                      key={sd.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs",
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
                className="rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal"
              >
                {busy === s.id ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <CheckCircle2 className="size-3.5" aria-hidden />
                )}
                Approve &amp; publish
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
                className="ml-auto hidden items-center gap-1 font-mono text-sm text-white/60 hover:text-white/70 sm:flex"
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

// ── Section: Tools (listings CRUD) ───────────────────────────────────────

const GRADIENTS = [
  "from-orange-500 to-amber-700",
  "from-amber-500 to-orange-700",
  "from-rose-600 to-orange-700",
  "from-lime-600 to-emerald-700",
  "from-yellow-500 to-orange-600",
  "from-orange-600 to-red-700",
];

type AdminCat = { id: string; name: string; emoji: string; features: string };

/**
 * Create-listing form (Task 32 CMS): POST /api/admin/tools. Slugs auto-derive
 * from the name server-side; the preview line shows what will happen.
 */
function ListingCreateForm({
  apiKey,
  categories,
  onDone,
}: {
  apiKey: string;
  categories: AdminCat[];
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: "",
    slug: "",
    tagline: "",
    description: "",
    websiteUrl: "",
    categoryId: "",
    pricingModel: "freemium",
    startingPrice: "",
    tags: "",
    logoEmoji: "⬡",
    logoGradient: GRADIENTS[0],
    hasApi: false,
    status: "live",
  });

  const autoSlug =
    f.slug ||
    f.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const create = async () => {
    setBusy(true);
    try {
      const res = await adminFetch(apiKey, "/api/admin/tools", {
        method: "POST",
        body: JSON.stringify({
          name: f.name,
          slug: f.slug || undefined,
          tagline: f.tagline,
          description: f.description || undefined,
          websiteUrl: f.websiteUrl,
          categoryId: f.categoryId,
          pricingModel: f.pricingModel,
          startingPrice: f.startingPrice || undefined,
          tags: f.tags,
          logoEmoji: f.logoEmoji || undefined,
          logoGradient: f.logoGradient,
          hasApi: f.hasApi,
          status: f.status,
        }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string; slug?: string };
      if (!res.ok || !d.ok) {
        toast({ title: d.error ?? "Create failed", variant: "destructive" });
        return;
      }
      toast({ title: `${f.name} created`, description: `/tools/${d.slug}` });
      onDone();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const valid =
    f.name.trim().length >= 2 &&
    f.tagline.trim().length >= 5 &&
    /^https?:\/\/.+/.test(f.websiteUrl.trim()) &&
    f.categoryId !== "";

  return (
    <div className="space-y-4 rounded-xl border border-ember/25 bg-ember/[0.04] p-4">
      <p className="font-mono text-xs tracking-[0.2em] text-ember uppercase">
        New listing
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name (2 to 60 chars)">
          <Input
            value={f.name}
            maxLength={60}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            className={inputCx}
            placeholder="Acme Writer"
          />
        </Field>
        <Field label="Slug (auto from name)">
          <Input
            value={f.slug}
            onChange={(e) => setF({ ...f, slug: e.target.value })}
            className={cn(inputCx, "font-mono")}
            placeholder="auto"
          />
          <p className="font-mono text-xs text-white/55">/tools/{autoSlug || "your-tool"}</p>
        </Field>
        <Field label="Tagline (5 to 60 chars)">
          <Input
            value={f.tagline}
            maxLength={60}
            onChange={(e) => setF({ ...f, tagline: e.target.value })}
            className={inputCx}
          />
          <p className="text-xs text-white/55">{f.tagline.length}/60</p>
        </Field>
        <Field label="Website URL">
          <Input
            value={f.websiteUrl}
            onChange={(e) => setF({ ...f, websiteUrl: e.target.value })}
            className={inputCx}
            placeholder="https://example.com"
          />
        </Field>
        <Field label="Category">
          <Select value={f.categoryId} onValueChange={(v) => setF({ ...f, categoryId: v })}>
            <SelectTrigger className={inputCx}><SelectValue placeholder="Pick a category" /></SelectTrigger>
            <SelectContent className="border-white/10 bg-coal text-white">
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <Field label="Starting price">
          <Input
            value={f.startingPrice}
            onChange={(e) => setF({ ...f, startingPrice: e.target.value })}
            className={inputCx}
            placeholder="$19/mo"
          />
        </Field>
        <Field label="Tags (pipe-separated, max 5)">
          <Input
            value={f.tags}
            onChange={(e) => setF({ ...f, tags: e.target.value })}
            className={inputCx}
            placeholder="open-source|api-available"
          />
        </Field>
        <Field label="Logo emoji">
          <Input
            value={f.logoEmoji}
            maxLength={8}
            onChange={(e) => setF({ ...f, logoEmoji: e.target.value })}
            className={cn(inputCx, "w-20 text-center text-base")}
          />
        </Field>
        <Field label="Status">
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
            <SelectTrigger className={inputCx}><SelectValue /></SelectTrigger>
            <SelectContent className="border-white/10 bg-coal text-white">
              <SelectItem value="live">live</SelectItem>
              <SelectItem value="draft">draft</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <Textarea
              value={f.description}
              rows={3}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              className={inputCx}
            />
          </Field>
        </div>
      </div>

      <div>
        <p className={labelCx}>Gradient</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {GRADIENTS.map((g) => (
            <button
              key={g}
              type="button"
              aria-label={`Gradient ${g}`}
              onClick={() => setF({ ...f, logoGradient: g })}
              className={cn(
                "size-8 rounded-lg bg-gradient-to-br transition-transform active:scale-90",
                g,
                f.logoGradient === g ? "ring-2 ring-ember ring-offset-2 ring-offset-coal" : "opacity-60 hover:opacity-100"
              )}
            />
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-white/70">
        <Switch checked={f.hasApi} onCheckedChange={(v) => setF({ ...f, hasApi: v })} />
        Has a public API
      </label>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3.5">
        <Button
          disabled={busy || !valid}
          onClick={() => void create()}
          className="rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          Create listing
        </Button>
        <Button variant="ghost" onClick={onDone} className="rounded-lg text-white/60 hover:text-white">
          Cancel
        </Button>
        <span className="font-mono text-xs text-white/55">
          LIVE LISTINGS APPEAR IN THE DIRECTORY IMMEDIATELY · DRAFTS STAY HIDDEN
        </span>
      </div>
    </div>
  );
}

/**
 * Per-tool comparison-features editor (Task 32): PATCH /api/admin/tools with
 * a whole-object `features` replace. Remounts on category change via key=
 * {categoryId} in ListingEditor, so rows always re-seed from that category's
 * axes without render-adjust gymnastics.
 */
function FeaturesEditor({
  apiKey,
  tool,
  axes,
  categoryName,
  onSaved,
}: {
  apiKey: string;
  tool: AdminTool;
  axes: string[];
  categoryName: string;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const k of axes) base[k] = tool.features[k] ?? "";
    // Preserve custom keys already stored on the tool.
    for (const [k, v] of Object.entries(tool.features)) {
      if (!axes.includes(k)) base[k] = v;
    }
    return base;
  });
  const [customs, setCustoms] = useState<string[]>(() =>
    Object.keys(tool.features).filter((k) => !axes.includes(k))
  );
  const [newKey, setNewKey] = useState("");

  const addCustom = () => {
    const k = newKey.trim().slice(0, 60);
    if (!k || axes.includes(k) || customs.includes(k)) return;
    setCustoms((p) => [...p, k]);
    setVals((p) => (p[k] === undefined ? { ...p, [k]: "" } : p));
    setNewKey("");
  };

  const removeCustom = (k: string) => {
    setCustoms((p) => p.filter((x) => x !== k));
    setVals((p) => {
      const next = { ...p };
      delete next[k];
      return next;
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      const features: Record<string, string> = {};
      for (const [k, v] of Object.entries(vals)) {
        const t = v.trim();
        if (t) features[k.trim()] = t;
      }
      const res = await adminFetch(apiKey, "/api/admin/tools", {
        method: "PATCH",
        body: JSON.stringify({ id: tool.id, features }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) {
        toast({ title: d.error ?? "Save failed", variant: "destructive" });
        return;
      }
      toast({ title: "Features saved", description: `Live on /compare for ${categoryName}.` });
      onSaved();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="flex items-center gap-1.5 font-mono text-xs tracking-[0.2em] text-ember uppercase">
        <Scale className="size-3.5" aria-hidden />
        Comparison features
      </p>
      <p className="mt-1 text-xs text-white/55">
        Matrix rows on /compare for {categoryName}. Values stay short (max 120 chars).
      </p>
      <div className="mt-3 space-y-2">
        {[...axes, ...customs].map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-36 shrink-0 truncate text-sm text-white/80" title={k}>
              {k}
            </span>
            <Input
              value={vals[k] ?? ""}
              maxLength={120}
              aria-label={`Value for ${k}`}
              placeholder="Short value, e.g. 128k tokens"
              onChange={(e) => setVals((p) => ({ ...p, [k]: e.target.value }))}
              className={inputCx}
            />
            {!axes.includes(k) && (
              <button
                type="button"
                aria-label={`Remove custom row ${k}`}
                onClick={() => removeCustom(k)}
                className="rounded-lg p-2 text-white/60 transition-colors hover:text-red-400"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
        ))}
        {axes.length === 0 && customs.length === 0 && (
          <p className="text-xs text-white/55">
            No axes for this category yet. Add comparison axes in the Taxonomy tab.
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Custom row name"
          aria-label="Custom feature name"
          maxLength={60}
          className="w-44 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/55"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={addCustom}
          disabled={!newKey.trim()}
          className="rounded-lg border-white/15 text-white/70 hover:bg-white/5"
        >
          <Plus className="size-3.5" aria-hidden />
          Add row
        </Button>
        <span className="text-xs text-white/55">Axes are managed per category in the Taxonomy tab.</span>
      </div>

      <div className="mt-3 border-t border-white/10 pt-3">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg border-ember/40 text-ember hover:bg-ember/10 hover:text-ember-hot"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          Save features
        </Button>
      </div>
    </div>
  );
}

/** "Mar 5, 2025" — editorial stamp dates (renders client-side only). */
function fmtDayDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ListingEditor({
  apiKey,
  tool,
  categories,
  onSaved,
}: {
  apiKey: string;
  tool: AdminTool;
  categories: AdminCat[];
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
  // Listing media (Task 34-c): uploaded logo + screenshot strip. Only sent in
  // the PATCH when actually changed, so untouched tools never risk a clear.
  const [logoUrl, setLogoUrl] = useState<string | null>(tool.logoUrl);
  const [screenshots, setScreenshots] = useState<string[]>(tool.screenshotUrls);
  const initialMedia = useRef({
    logoUrl: tool.logoUrl,
    screenshots: tool.screenshotUrls,
  });
  // Editorial content (Task 35): long description, use cases, pros/cons,
  // alternative slugs and the pricing fact-check. Initial values are
  // captured here so the shared Save only sends keys that actually changed
  // (same contract as initialMedia above) — untouched saves never wipe or
  // re-stamp editorial fields.
  const [longDescription, setLongDescription] = useState(tool.longDescription ?? "");
  const [useCases, setUseCases] = useState<{ title: string; body: string }[]>(
    tool.useCases ?? []
  );
  const [pros, setPros] = useState<string[]>(tool.pros ?? []);
  const [cons, setCons] = useState<string[]>(tool.cons ?? []);
  const [alternatives, setAlternatives] = useState<string[]>(tool.alternatives ?? []);
  const [pricingChecked, setPricingChecked] = useState(tool.pricingCheckedAt != null);
  const initialEditorial = useRef({
    longDescription: tool.longDescription ?? "",
    useCases: tool.useCases ?? [],
    pros: tool.pros ?? [],
    cons: tool.cons ?? [],
    alternatives: tool.alternatives ?? [],
    pricingChecked: tool.pricingCheckedAt != null,
  });

  // Alternatives picker source: the full directory row list (slug + name),
  // fetched once when the editor expands. setState runs in the promise
  // callback — the repo lint bans synchronous setState inside effects.
  const [allRows, setAllRows] = useState<
    { slug: string; name: string }[] | null
  >(null);
  const [altPick, setAltPick] = useState("");
  useEffect(() => {
    let alive = true;
    adminFetch(apiKey, "/api/admin/tools")
      .then((r) => r.json())
      .then((d: { tools?: { slug: string; name: string }[] }) => {
        if (alive) setAllRows(Array.isArray(d.tools) ? d.tools : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [apiKey]);
  const altOptions = (allRows ?? []).filter(
    (t) => t.slug !== tool.slug && !alternatives.includes(t.slug)
  );

  const addUseCase = () =>
    setUseCases((p) => (p.length >= 6 ? p : [...p, { title: "", body: "" }]));
  const setUseCase = (
    i: number,
    patch: Partial<{ title: string; body: string }>
  ) => setUseCases((p) => p.map((u, j) => (j === i ? { ...u, ...patch } : u)));
  const removeUseCase = (i: number) =>
    setUseCases((p) => p.filter((_, j) => j !== i));

  const save = async () => {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
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
      };
      if (logoUrl !== initialMedia.current.logoUrl) {
        payload.logoUrl = logoUrl;
      }
      if (
        JSON.stringify(screenshots) !==
        JSON.stringify(initialMedia.current.screenshots)
      ) {
        payload.screenshotUrls = screenshots;
      }
      // Editorial content (Task 35): each key is sent only when it differs
      // from the mount-time snapshot, so untouched saves are harmless.
      if (longDescription !== initialEditorial.current.longDescription) {
        const t = longDescription.trim();
        payload.longDescription = t.length > 0 ? t : null;
      }
      if (
        JSON.stringify(useCases) !==
        JSON.stringify(initialEditorial.current.useCases)
      ) {
        payload.useCases = useCases;
      }
      if (JSON.stringify(pros) !== JSON.stringify(initialEditorial.current.pros)) {
        payload.pros = pros;
      }
      if (JSON.stringify(cons) !== JSON.stringify(initialEditorial.current.cons)) {
        payload.cons = cons;
      }
      if (
        JSON.stringify(alternatives) !==
        JSON.stringify(initialEditorial.current.alternatives)
      ) {
        payload.alternatives = alternatives;
      }
      if (pricingChecked !== initialEditorial.current.pricingChecked) {
        payload.pricingChecked = pricingChecked;
      }
      const res = await adminFetch(apiKey, "/api/admin/tools", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const d = (await res.json()) as {
        ok?: boolean;
        error?: string;
        errors?: string[];
      };
      if (!res.ok || !d.ok) {
        const errs = Array.isArray(d.errors) ? d.errors : [];
        toast({
          title: errs.length > 0 ? "Save failed" : (d.error ?? "Save failed"),
          description: errs.length > 0 ? errs.join(" ") : undefined,
          variant: "destructive",
        });
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
        toast({ title: `${tool.name} removed (soft delete, history kept)` });
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
        toast({ title: `${tool.name} marked verified`, description: "Verified-at stamped. Staleness clock reset." });
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
          <p className="text-xs text-white/55">{f.tagline.length}/60</p>
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
        <Field label="Pin rank (0 = none; 1 tops the directory)">
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
            ["editorsPick", "Editor's Pick", f.editorsPick],
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

      {/* Listing media (Task 34-c): uploaded logo + screenshot strip. */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="flex items-center gap-1.5 font-mono text-xs tracking-[0.2em] text-ember uppercase">
          <Images className="size-3.5" aria-hidden />
          Listing media
        </p>
        <p className="mt-1 text-xs text-white/55">
          Applies on “Save changes”. The logo replaces the emoji tile wherever
          the listing renders.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field
            label="Logo image"
            hint="Square tile. Leave empty to keep the emoji + gradient."
          >
            <ImageUploadField
              value={logoUrl}
              onChange={(url) => setLogoUrl(url)}
              purpose="tool-logo"
              endpoint="admin"
              editorKey={apiKey}
              square
            />
          </Field>
          <div className="space-y-2">
            <p className={labelCx}>Screenshots ({screenshots.length}/12)</p>
            {screenshots.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {screenshots.map((url) => (
                  <div
                    key={url}
                    className="relative size-20 overflow-hidden rounded-lg border border-white/10 bg-ink"
                  >
                    <img
                      src={url}
                      alt="Listing screenshot"
                      loading="lazy"
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      aria-label="Remove screenshot"
                      onClick={() =>
                        setScreenshots((p) => p.filter((u) => u !== url))
                      }
                      className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white/85 transition-colors hover:text-red-300"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {screenshots.length < 12 ? (
              <ImageUploadField
                value={null}
                onChange={(url, result) => {
                  if (url && result) {
                    setScreenshots((p) => (p.includes(url) ? p : [...p, url]));
                  }
                }}
                purpose="tool-screenshot"
                endpoint="admin"
                editorKey={apiKey}
                label={screenshots.length > 0 ? "Add another" : "Add screenshot"}
                hint="Uploads append to the strip; saving stores the whole list."
              />
            ) : (
              <p className="text-xs text-white/55">
                Screenshot cap reached (12). Remove one to add another.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Editorial content (Task 35): deep listing copy the public page
          renders. Mount-time values live in initialEditorial so the shared
          Save only sends what changed. */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="flex items-center gap-1.5 font-mono text-xs tracking-[0.2em] text-ember uppercase">
            <FileText className="size-3.5" aria-hidden />
            Editorial content
          </p>
          {tool.contentUpdatedAt && (
            <span className="font-mono text-xs text-white/55">
              Updated {fmtDayDate(tool.contentUpdatedAt)}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-white/55">
          Deep listing copy for the public page. Applied on “Save changes”.
        </p>

        <div className="mt-4 space-y-5">
          {/* Long description */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label className={labelCx}>Long description</Label>
              <span className="font-mono text-xs tabular-nums text-white/55">
                {longDescription.length}/5000
              </span>
            </div>
            <Textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              rows={6}
              maxLength={5000}
              placeholder="What the tool actually does, who it is for, and how it works."
              aria-label="Long description"
              className={inputCx}
            />
            <p className="text-xs text-white/55">
              2 to 3 paragraphs, separated by blank lines. This is the real,
              factual description shown on the public page.
            </p>
          </div>

          {/* Use cases */}
          <div className="space-y-2">
            <Label className={labelCx}>Use cases ({useCases.length}/6)</Label>
            <p className="text-xs text-white/55">
              Titled blocks on the public page: what the tool is actually used for.
            </p>
            {useCases.map((uc, i) => (
              <div
                key={i}
                className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={uc.title}
                    maxLength={80}
                    placeholder={`Use case ${i + 1} title, e.g. Automate lead routing`}
                    aria-label={`Use case ${i + 1} title`}
                    onChange={(e) => setUseCase(i, { title: e.target.value })}
                    className={cn(inputCx, "flex-1")}
                  />
                  <button
                    type="button"
                    aria-label={`Remove use case ${i + 1}`}
                    onClick={() => removeUseCase(i)}
                    className="rounded-lg p-2 text-white/60 transition-colors hover:text-red-400"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
                <Textarea
                  value={uc.body}
                  rows={2}
                  maxLength={400}
                  placeholder="What it does and why it works, in two or three sentences."
                  aria-label={`Use case ${i + 1} description`}
                  onChange={(e) => setUseCase(i, { body: e.target.value })}
                  className={inputCx}
                />
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              disabled={useCases.length >= 6}
              onClick={addUseCase}
              className="rounded-lg border-white/15 text-white/70 hover:bg-white/5"
            >
              <Plus className="size-3.5" aria-hidden />
              Add use case
            </Button>
          </div>

          {/* Pros + cons */}
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              {
                label: "Pros",
                noun: "pro",
                list: pros,
                setList: setPros,
                helper: "Genuine strengths, one per row. Specific beats generic.",
                placeholder: "Specific strength, e.g. Sets up in two minutes",
              },
              {
                label: "Cons",
                noun: "con",
                list: cons,
                setList: setCons,
                helper: "Honest limitations, one per row. Real downsides build trust.",
                placeholder: "Real limitation, e.g. No offline mode",
              },
            ]).map(({ label, noun, list, setList, helper, placeholder }) => (
              <div key={label} className="space-y-2">
                <Label className={labelCx}>
                  {label} ({list.length}/6)
                </Label>
                <p className="text-xs text-white/55">{helper}</p>
                {list.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={item}
                      maxLength={160}
                      placeholder={placeholder}
                      aria-label={`${label} item ${i + 1}`}
                      onChange={(e) =>
                        setList((p) =>
                          p.map((v, j) => (j === i ? e.target.value : v))
                        )
                      }
                      className={cn(inputCx, "flex-1")}
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${noun} ${i + 1}`}
                      onClick={() => setList((p) => p.filter((_, j) => j !== i))}
                      className="rounded-lg p-2 text-white/60 transition-colors hover:text-red-400"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={list.length >= 6}
                  onClick={() => setList((p) => [...p, ""])}
                  className="rounded-lg border-white/15 text-white/70 hover:bg-white/5"
                >
                  <Plus className="size-3.5" aria-hidden />
                  Add {noun}
                </Button>
              </div>
            ))}
          </div>

          {/* Alternatives */}
          <div className="space-y-2">
            <Label className={labelCx}>Alternatives ({alternatives.length}/6)</Label>
            <p className="text-xs text-white/55">
              Shown as “Alternatives to {tool.name}” on the public page. Pick
              other directory listings.
            </p>
            {alternatives.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {alternatives.map((slug) => (
                  <span
                    key={slug}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 py-1 pl-2.5 pr-1 font-mono text-xs text-white/80"
                  >
                    {slug}
                    <button
                      type="button"
                      aria-label={`Remove alternative ${slug}`}
                      onClick={() =>
                        setAlternatives((p) => p.filter((s) => s !== slug))
                      }
                      className="rounded-full p-1.5 text-white/60 transition-colors hover:text-red-300"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {alternatives.length >= 6 ? (
              <p className="text-xs text-white/55">
                Cap reached (6). Remove one to add another.
              </p>
            ) : allRows === null ? (
              <Select disabled value="">
                <SelectTrigger
                  className={cn(inputCx, "sm:max-w-sm")}
                  aria-label="Add alternative"
                >
                  <SelectValue placeholder="Loading listings…" />
                </SelectTrigger>
              </Select>
            ) : altOptions.length === 0 ? (
              <p className="text-xs text-white/55">No other listings to link yet.</p>
            ) : (
              <Select
                value={altPick}
                onValueChange={(slug) => {
                  setAlternatives((p) => (p.includes(slug) ? p : [...p, slug]));
                  setAltPick("");
                }}
              >
                <SelectTrigger
                  className={cn(inputCx, "sm:max-w-sm")}
                  aria-label="Add alternative"
                >
                  <SelectValue placeholder="Add alternative" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-coal text-white">
                  {altOptions.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.name} <span className="font-mono text-xs text-white/50">/{t.slug}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Pricing fact-check */}
          <div className="space-y-1.5">
            <Label className={labelCx}>Pricing fact-check</Label>
            <label className="flex min-h-11 w-fit items-center gap-2 text-xs text-white/70">
              <Switch checked={pricingChecked} onCheckedChange={setPricingChecked} />
              Pricing checked
            </label>
            <p className="text-xs text-white/55">
              {tool.pricingCheckedAt
                ? `Last checked ${fmtDayDate(tool.pricingCheckedAt)}.`
                : "Not fact-checked yet. Tick this once you have verified the price on the vendor site."}
            </p>
          </div>
        </div>
      </div>

      {/* Task 32: per-tool comparison matrix values. key= remounts when the
          category changes so rows re-seed from that category's axes. */}
      <FeaturesEditor
        key={f.categoryId}
        apiKey={apiKey}
        tool={tool}
        axes={(categories.find((c) => c.id === f.categoryId)?.features ?? "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)}
        categoryName={
          categories.find((c) => c.id === f.categoryId)?.name ?? tool.category.name
        }
        onSaved={onSaved}
      />

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3.5">
        <Button
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal"
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
  const [cats, setCats] = useState<AdminCat[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
      .then((d: { categories: AdminCat[] }) => setCats(d.categories))
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
        <Button
          size="sm"
          onClick={() => setCreating((v) => !v)}
          aria-expanded={creating}
          className="ml-auto rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal"
        >
          <Plus className="size-4" aria-hidden />
          Add listing
        </Button>
      </div>

      {creating && (
        <ListingCreateForm
          apiKey={apiKey}
          categories={cats}
          onDone={() => {
            setCreating(false);
            load();
            onChanged();
          }}
        />
      )}

      {tools === null && <Spinner />}
      {tools?.length === 0 && (
        <p className="py-10 text-center text-sm text-white/55">No listings match.</p>
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
              {t.logoUrl ? (
                <img
                  src={t.logoUrl}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="size-8 shrink-0 rounded-lg border border-white/10 bg-ink object-contain p-0.5"
                />
              ) : (
                <span aria-hidden className="text-lg">{t.logoEmoji}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-bold text-white">
                  {t.name}
                  {t.pinned > 0 && <Pin className="size-3 text-ember" aria-hidden />}
                  {t.editorsPick && <Star className="size-3 shrink-0 text-ember" aria-label="Editor's Pick" />}
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-px font-mono text-xs tracking-wider uppercase",
                      t.status === "live"
                        ? "bg-emerald-400/10 text-emerald-400/80"
                        : "bg-white/10 text-white/60"
                    )}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                </p>
                <p className="truncate text-xs text-white/50">{t.tagline}</p>
              </div>
              <span className="hidden shrink-0 font-mono text-xs text-white/60 md:block">
                {t.category.emoji} {t.category.name}
              </span>
              <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60 sm:inline">
                {t.pricingModel.replace("_", " ")}
                {t.startingPrice ? ` · ${t.startingPrice}` : ""}
              </span>
              <span
                className="hidden shrink-0 font-mono text-xs tabular-nums text-white/50 lg:block"
                title={`${t.reviews} published reviews · ${t.comments} comments`}
              >
                {t.reviews} rev · {t.comments} cmt
              </span>
              <ChevronDown
                className={cn("size-4 shrink-0 text-white/60 transition-transform", expanded === t.id && "rotate-180")}
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

// ── Section: Journal (blog CRUD) ─────────────────────────────────────────

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
  /** Uploaded cover image (Task 34): /api/media/{id} URL or null. */
  coverUrl: string | null;
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
  coverUrl: null,
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
        coverUrl: f.coverUrl || null,
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
        description: d.slug ? `/journal/${d.slug}` : undefined,
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
          <Input value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCx} placeholder="How to evaluate an AI tool in 15 minutes" />
        </Field>
        <Field label="Slug (auto from title if blank)">
          <Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} className={cn(inputCx, "font-mono")} placeholder="how-to-evaluate-an-ai-tool" />
        </Field>
      </div>

      <Field label="Excerpt (20–200 · cards + meta description)">
        <Textarea value={f.excerpt} rows={2} maxLength={200} onChange={(e) => setF({ ...f, excerpt: e.target.value })} className={inputCx} />
        <p className="text-xs text-white/55">{f.excerpt.length}/200</p>
      </Field>

      <Field label="Body (markdown: ##, lists, **bold**, `code`, ``` blocks)">
        <Textarea
          value={f.body}
          rows={10}
          onChange={(e) => setF({ ...f, body: e.target.value })}
          className={cn(inputCx, "font-mono text-xs leading-relaxed")}
        />
        <p className="text-xs text-white/55">
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

      {/* Cover image (Task 34-c): uploaded cover beats the emoji gradient. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Cover image"
          hint="Shown instead of the emoji gradient wherever the post renders."
        >
          <ImageUploadField
            value={f.coverUrl}
            onChange={(url) => setF({ ...f, coverUrl: url })}
            purpose="post-cover"
            endpoint="admin"
            editorKey={apiKey}
          />
        </Field>
        <div className="space-y-1.5">
          <span className={labelCx}>Preview</span>
          {f.coverUrl ? (
            <img
              src={f.coverUrl}
              alt="Post cover preview"
              className="aspect-video w-full rounded-xl border border-white/10 bg-ink object-cover"
            />
          ) : (
            <div
              aria-hidden
              className={cn(
                "flex aspect-video w-full items-center justify-center rounded-xl bg-gradient-to-br text-3xl",
                f.coverGradient
              )}
            >
              {f.coverEmoji}
            </div>
          )}
        </div>
      </div>

      {/* SEO panel */}
      <div className="rounded-xl border border-ember/25 bg-ember/[0.04] p-4">
        <p className="flex items-center gap-1.5 font-mono text-xs tracking-[0.2em] text-ember uppercase">
          <BarChart3 className="size-3.5" aria-hidden /> SEO panel
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="SEO title (≤60, falls back to title)">
            <Input value={f.seoTitle} maxLength={70} onChange={(e) => setF({ ...f, seoTitle: e.target.value })} className={inputCx} />
            <p className={cn("text-xs", seoTitle.length > 60 ? "text-red-400" : "text-white/55")}>
              {seoTitle.length}/60 {seoTitle.length > 60 && "(will truncate in SERP)"}
            </p>
          </Field>
          <Field label="Keywords (comma-separated)">
            <Input value={f.keywords} onChange={(e) => setF({ ...f, keywords: e.target.value })} className={inputCx} placeholder="evaluate ai tools, ai tool directory" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="SEO description (≤160, falls back to excerpt)">
              <Textarea value={f.seoDescription} rows={2} maxLength={170} onChange={(e) => setF({ ...f, seoDescription: e.target.value })} className={inputCx} />
              <p className={cn("text-xs", seoDesc.length > 160 ? "text-red-400" : "text-white/55")}>
                {seoDesc.length}/160
              </p>
            </Field>
          </div>
        </div>

        {/* SERP preview */}
        <div className="mt-3 rounded-lg border border-white/10 bg-coal p-3.5">
          <p className="font-mono text-xs tracking-widest text-white/55 uppercase">
            SERP preview
          </p>
          <p className="mt-1.5 truncate text-xs text-emerald-400/90">
            prother.dev › journal › {f.slug || "your-post-slug"}
          </p>
          <p className="mt-0.5 truncate text-base font-semibold text-white/90">
            {seoTitle || "Untitled post"}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-white/50">
            {seoDesc || "Write an excerpt that earns the click. It doubles as the meta description."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={busy || !f.title || (isNew && f.body.trim().length < 50)}
          onClick={() => void save()}
          className="rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal"
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
        <p className="font-mono text-xs tracking-wider text-white/55 uppercase">
          {posts?.length ?? "…"} posts · drafts never render publicly
        </p>
        <Button
          size="sm"
          onClick={() => setEditing({ ...EMPTY_POST })}
          className="rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal"
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
            {p.coverUrl ? (
              <img
                src={p.coverUrl}
                alt=""
                aria-hidden
                loading="lazy"
                className="h-9 w-14 shrink-0 rounded-lg border border-white/10 bg-ink object-cover"
              />
            ) : (
              <span aria-hidden className="text-lg">{p.coverEmoji}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{p.title}</p>
              <p className="truncate font-mono text-xs text-white/60">
                /journal/{p.slug} · {p.category} · {p.readingMinutes} min · {p.views} views
                {p.seoTitle || p.seoDescription || p.keywords ? " · SEO ✓" : " · SEO ✕"}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 font-mono text-xs tracking-wider uppercase",
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
                className="rounded-lg p-2 text-white/60 transition-colors hover:text-ember"
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
                  coverUrl: p.coverUrl ?? null,
                  author: p.author,
                  status: p.status,
                  seoTitle: p.seoTitle ?? "",
                  seoDescription: p.seoDescription ?? "",
                  keywords: p.keywords ?? "",
                })
              }
              className="rounded-lg p-2 text-white/60 transition-colors hover:text-ember"
              aria-label={`Edit ${p.title}`}
            >
              <Pencil className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
      <p className="font-mono text-xs leading-relaxed text-white/55">
        METADATA-ONLY EDITS KEEP THE STORED MARKDOWN · REWRITE THE BODY FIELD TO
        REPLACE IT. READING TIME RECOMPUTES ON BODY SAVE.
      </p>
    </div>
  );
}

// ── Section: Categories (taxonomy CRUD) ──────────────────────────────────

function TaxonomyTab({ apiKey, onChanged }: { apiKey: string; onChanged: () => void }) {
  const { toast } = useToast();
  const [cats, setCats] = useState<
    { id: string; slug: string; name: string; emoji: string; sortOrder: number; toolCount: number; features: string }[]
  >([]);
  const [draft, setDraft] = useState({ slug: "", name: "", emoji: "🧪", features: "" });

  const load = useCallback(() => {
    adminFetch(apiKey, "/api/admin/categories")
      .then((r) => r.json())
      .then((d: { categories: typeof cats }) => setCats(d.categories))
      .catch(() => {});
  }, [apiKey]);
  useEffect(load, [load]);

  const save = useCallback(
    async (payload: { id?: string; slug: string; name: string; emoji: string; features?: string }) => {
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
            <span className="font-mono text-xs text-white/55">{c.slug}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60">
              {c.toolCount} tools
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void save({ id: c.id, slug: c.slug, name: c.name, emoji: c.emoji, features: c.features })}
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
            <Input
              value={c.features}
              aria-label={`Comparison axes for ${c.name}`}
              onChange={(e) =>
                setCats((p) =>
                  p.map((x) => (x.id === c.id ? { ...x, features: e.target.value } : x))
                )
              }
              placeholder="Comparison axes, pipe-separated: Context window|Voice input"
              className="w-full border-white/10 bg-white/5 font-mono text-xs text-white placeholder:text-white/55"
            />
            <p className="w-full font-mono text-xs tracking-wider text-white/45 uppercase">
              Comparison axes · rows on the /compare matrix
            </p>
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
            className="min-w-40 flex-1 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/55"
          />
          <Input
            value={draft.slug}
            onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            placeholder="slug"
            className="w-40 border-white/10 bg-white/5 font-mono text-xs text-white placeholder:text-white/55"
          />
          <Input
            value={draft.features}
            onChange={(e) => setDraft({ ...draft, features: e.target.value })}
            placeholder="Comparison axes (optional): Context window|Voice input"
            className="min-w-56 flex-1 border-white/10 bg-white/5 font-mono text-xs text-white placeholder:text-white/55"
          />
          <Button
            disabled={!draft.name || draft.name.length < 2}
            onClick={() => {
              void save(draft).then((ok) => {
                if (ok) setDraft({ slug: "", name: "", emoji: "🧪", features: "" });
              });
            }}
            className="rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal"
          >
            <Plus className="size-4" aria-hidden />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Section: Settings (site copy KV) ─────────────────────────────────

/**
 * Frontend-elements CMS (Task 32): grouped, human-labeled fields over the
 * SiteSetting KV. Each card maps one rendered surface; keys are shown in the
 * hint line so editors can wire custom values elsewhere. Defaults live in
 * the consuming components, so a blank field never breaks the page.
 */
const SETTING_GROUPS: {
  title: string;
  hint?: string;
  fields: { key: string; label: string; multiline?: boolean; hint?: string }[];
}[] = [
  {
    title: "Hero",
    hint: "The landing page spotlight section.",
    fields: [
      { key: "hero.headline", label: "Hero headline", hint: "Last word renders in ember." },
      { key: "hero.subline", label: "Hero subline", multiline: true },
      { key: "hero.announcement", label: "Announcement pill" },
    ],
  },
  {
    title: "Homepage sections",
    hint: "Server-rendered section copy below the hero.",
    fields: [
      { key: "home.categoriesKicker", label: "Categories kicker" },
      { key: "home.categoriesHeading", label: "Categories heading", hint: "Last word renders in ember." },
      { key: "home.picksKicker", label: "Editor's Picks kicker" },
      { key: "home.picksHeading", label: "Picks heading", hint: "Last word renders in ember." },
      { key: "home.closingHeadline", label: "Closing band headline", hint: "Line breaks stack the headline.", multiline: true },
      { key: "home.closingSub", label: "Closing band subline" },
    ],
  },
  {
    title: "Footer",
    fields: [
      { key: "footer.tagline", label: "Footer tagline", hint: "Short line under the brand." },
      { key: "footer.note", label: "Footer note" },
    ],
  },
  {
    title: "SEO",
    fields: [
      { key: "seo.defaultTitle", label: "Default SEO title (≤60)" },
      { key: "seo.defaultDescription", label: "Default SEO description (≤160)", multiline: true },
    ],
  },
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
        toast({ title: "Site copy saved", description: `${d.updated} keys written. Refresh to see it live.` });
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
      <div className="space-y-4">
        {/* Branding (Task 35): site logo + favicon, stored as site-copy KV
            keys so the normal Save below persists them with everything else. */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="flex items-center gap-1.5 font-mono text-xs tracking-[0.2em] text-ember uppercase">
            <Hexagon className="size-3.5" aria-hidden />
            Branding
          </p>
          <p className="mt-1 text-xs text-white/55">
            The logo replaces the mark in the site header. The favicon replaces
            the browser tab icon. Changes apply site wide after save.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={labelCx}>Site logo</Label>
              <ImageUploadField
                value={values["branding.logoUrl"] || null}
                onChange={(url) =>
                  setValues({ ...values, "branding.logoUrl": url ?? "" })
                }
                purpose="branding"
                endpoint="admin"
                editorKey={apiKey}
                square
                hint="Square PNG or WebP, 512 by 512 or larger. Auto-compressed to 2MB max."
              />
              <div className="flex items-center gap-2">
                <span
                  className="min-w-0 flex-1 truncate font-mono text-xs text-white/55"
                  title={values["branding.logoUrl"] || "No logo stored"}
                >
                  {values["branding.logoUrl"] || "No logo stored"}
                </span>
                {values["branding.logoUrl"] && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setValues({ ...values, "branding.logoUrl": "" })}
                    className="h-9 shrink-0 rounded-lg border-white/15 bg-white/5 text-sm text-white/70 hover:bg-white/10"
                  >
                    <X className="size-3.5" aria-hidden />
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCx}>Favicon</Label>
              <ImageUploadField
                value={values["branding.faviconUrl"] || null}
                onChange={(url) =>
                  setValues({ ...values, "branding.faviconUrl": url ?? "" })
                }
                purpose="branding"
                endpoint="admin"
                editorKey={apiKey}
                faviconMode
                hint="PNG, WebP or ICO. Square, 512KB max. Rendered at 16 to 32 pixels."
              />
              <div className="flex items-center gap-2">
                <span
                  className="min-w-0 flex-1 truncate font-mono text-xs text-white/55"
                  title={values["branding.faviconUrl"] || "No favicon stored"}
                >
                  {values["branding.faviconUrl"] || "No favicon stored"}
                </span>
                {values["branding.faviconUrl"] && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setValues({ ...values, "branding.faviconUrl": "" })
                    }
                    className="h-9 shrink-0 rounded-lg border-white/15 bg-white/5 text-sm text-white/70 hover:bg-white/10"
                  >
                    <X className="size-3.5" aria-hidden />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {SETTING_GROUPS.map((group) => (
          <div key={group.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="font-mono text-xs tracking-[0.2em] text-ember uppercase">
              {group.title}
            </p>
            {group.hint && <p className="mt-1 text-xs text-white/55">{group.hint}</p>}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {group.fields.map((sf) => (
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
            className="w-48 border-white/10 bg-white/5 font-mono text-xs text-white placeholder:text-white/55"
          />
          <Input
            value={extra.value}
            onChange={(e) => setExtra({ ...extra, value: e.target.value })}
            placeholder="value"
            className="flex-1 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/55"
          />
        </div>
      </div>

      <Button
        disabled={busy}
        onClick={() => void save()}
        className="rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
        Save site copy
      </Button>

      {/* API integrations (Task 34-c): self-contained credential manager,
          saved with its own PUT, separate from the site-copy KV above. */}
      <div className="border-t border-white/10 pt-4">
        <IntegrationsModule apiKey={apiKey} />
      </div>
    </div>
  );
}

// ── Overview: stat cards (delta pills + mini sparkline) ──────────────────

type Delta = { text: string; dir: "up" | "down" | "flat"; title: string };

/** Honest delta vs yesterday — no fabrication when the base is zero. */
function computeDelta(cur: number, prev: number): Delta {
  if (prev === 0 && cur === 0)
    return { text: "±0", dir: "flat", title: "No change vs yesterday" };
  if (prev === 0)
    return { text: "↑ new", dir: "up", title: `${cur} today · none yesterday` };
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0)
    return { text: "±0%", dir: "flat", title: `${cur} today vs ${prev} yesterday` };
  return pct > 0
    ? { text: `↑ ${pct}%`, dir: "up", title: `${cur} today vs ${prev} yesterday` }
    : { text: `↓ ${Math.abs(pct)}%`, dir: "down", title: `${cur} today vs ${prev} yesterday` };
}

const DELTA_CX: Record<Delta["dir"], string> = {
  up: "bg-emerald-400/10 text-emerald-400/80",
  down: "bg-red-400/10 text-red-400/80",
  flat: "bg-white/5 text-white/60",
};

function DeltaPill({ delta }: { delta: Delta }) {
  return (
    <span
      title={delta.title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs",
        DELTA_CX[delta.dir]
      )}
    >
      {delta.text}
    </span>
  );
}

function MiniSpark({ data, className }: { data: number[]; className?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className={cn("flex h-8 items-end gap-[3px]", className)} aria-hidden>
      {data.map((v, i) => (
        <span
          key={i}
          className={cn(
            "min-w-[3px] flex-1 rounded-sm",
            i === data.length - 1 ? "bg-ember" : "bg-white/15"
          )}
          style={{ height: `${Math.max(8, Math.round((v / max) * 100))}%` }}
        />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  caption,
  spark,
  accent,
}: {
  label: string;
  value: string | number;
  delta?: Delta;
  caption?: string;
  spark?: number[];
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        accent ? "border-ember/40 bg-ember/[0.06]" : "border-white/10 bg-white/[0.02]"
      )}
    >
      <p className="font-mono text-xs tracking-[0.2em] text-white/60 uppercase">
        {label}
      </p>
      <p className="mt-1.5 text-3xl font-black tracking-tight text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {spark && <MiniSpark data={spark} className="mt-3" />}
      {(delta || caption) && (
        <div className="mt-2.5 flex min-h-5 flex-wrap items-center gap-2">
          {delta && <DeltaPill delta={delta} />}
          {caption && (
            <span className="min-w-0 truncate font-mono text-xs text-white/55">
              {caption}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Overview: charts row ─────────────────────────────────────────────────

function dayLabel(utcDayIndex: number): string {
  // Index 13 = today (UTC). Labels are display-only.
  const d = new Date(Date.now() - (13 - utcDayIndex) * 86_400_000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function TrendChartCard({
  label,
  noun,
  byDay,
}: {
  label: string;
  noun: string;
  byDay: number[];
}) {
  const max = Math.max(...byDay, 1);
  const total = byDay.reduce((a, b) => a + b, 0);
  return (
    <Panel>
      <div className="flex items-center justify-between gap-2">
        <p className={labelCx}>{label} · last 14 days</p>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60">
          {total} total
        </span>
      </div>
      <div
        role="img"
        aria-label={`${noun}s per day over the last 14 days, ${total} total`}
        className="mt-5 flex h-40 items-end gap-1.5 border-b border-white/10 pb-px"
      >
        {byDay.map((v, i) => (
          <div
            key={i}
            title={`${dayLabel(i)} · ${v} ${noun}${v === 1 ? "" : "s"}`}
            className="group flex h-full flex-1 items-end"
          >
            <span
              className={cn(
                "w-full rounded-t-[3px] transition-colors",
                i === 13 ? "bg-ember" : "bg-white/15 group-hover:bg-white/30"
              )}
              style={{ height: `${Math.max(3, Math.round((v / max) * 100))}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5" aria-hidden>
        {byDay.map((_, i) =>
          i % 3 === 0 || i === 13 ? (
            <span
              key={i}
              className={cn(
                "flex-1 text-center font-mono text-xs",
                i === 13 ? "text-ember" : "text-white/55"
              )}
            >
              {dayLabel(i)}
            </span>
          ) : (
            <span key={i} className="flex-1" />
          )
        )}
      </div>
    </Panel>
  );
}

/* Monochrome-plus-ember dot palette (brand tones only — no rainbow). */
const MIX_COLORS = [
  "#FF6A00",
  "#FFB877",
  "#F1EDE4",
  "rgba(255,255,255,0.55)",
  "rgba(255,255,255,0.32)",
  "rgba(255,255,255,0.16)",
];

function CategoryMixCard({ mix }: { mix: { name: string; count: number }[] }) {
  const top = mix.slice(0, 6);
  const rest = mix.slice(6).reduce((a, b) => a + b.count, 0);
  const rows = rest > 0 ? [...top, { name: "Other", count: rest }] : top;
  const total = mix.reduce((a, b) => a + b.count, 0);
  return (
    <Panel>
      <div className="flex items-center justify-between gap-2">
        <p className={labelCx}>Category mix</p>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60">
          {total} live
        </span>
      </div>
      <div className="mt-4 space-y-3.5">
        {rows.map((r, i) => (
          <div key={r.name}>
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: MIX_COLORS[i % MIX_COLORS.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-white/70">{r.name}</span>
              <span className="font-mono text-xs text-white/60">{r.count}</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${total ? Math.max(2, Math.round((r.count / total) * 100)) : 0}%`,
                  backgroundColor: MIX_COLORS[i % MIX_COLORS.length],
                }}
              />
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-10 text-center text-sm text-white/55">No live listings yet.</p>
        )}
      </div>
    </Panel>
  );
}

const PRICING_ORDER = ["free", "freemium", "paid", "open_source"] as const;
const PRICING_COLORS: Record<string, string> = {
  free: "#FF6A00",
  freemium: "#FFB877",
  paid: "#F1EDE4",
  open_source: "rgba(255,255,255,0.45)",
};

function PricingDonutCard({ mix }: { mix: { model: string; count: number }[] }) {
  const rows = PRICING_ORDER.map((m) => ({
    model: m,
    count: mix.find((x) => x.model === m)?.count ?? 0,
  })).filter((r) => r.count > 0);
  const total = rows.reduce((a, b) => a + b.count, 0);
  let acc = 0;
  const stops = rows.map((r) => {
    const start = (acc / total) * 100;
    acc += r.count;
    const end = (acc / total) * 100;
    return `${PRICING_COLORS[r.model] ?? "rgba(255,255,255,0.4)"} ${start}% ${end}%`;
  });
  return (
    <Panel>
      <p className={labelCx}>Pricing mix</p>
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
        <div
          role="img"
          aria-label={`Pricing mix across ${total} live tools`}
          className="relative size-36 shrink-0 rounded-full ring-1 ring-white/10"
          style={{ background: total > 0 ? `conic-gradient(${stops.join(",")})` : "rgba(255,255,255,0.05)" }}
        >
          <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-ink">
            <span className="text-2xl font-black tracking-tight text-white">
              {total.toLocaleString()}
            </span>
            <span className="font-mono text-xs tracking-[0.2em] text-white/60 uppercase">
              tools
            </span>
          </div>
        </div>
        <div className="w-full space-y-2">
          {rows.map((r) => (
            <div key={r.model} className="flex items-center gap-2 font-mono text-xs">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: PRICING_COLORS[r.model] }}
              />
              <span className="flex-1 text-white/60">{r.model.replace("_", " ")}</span>
              <span className="text-white/60">{r.count}</span>
            </div>
          ))}
          {total === 0 && (
            <p className="text-sm text-white/55">No live listings yet.</p>
          )}
        </div>
      </div>
    </Panel>
  );
}

// ── Overview: activity table + queue aging ───────────────────────────────

function ActivityCard({
  audit,
  className,
}: {
  audit: Overview["audit"];
  className?: string;
}) {
  return (
    <Panel className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className={labelCx}>Recent activity</p>
        <span className="font-mono text-xs text-white/55">audit trail</span>
      </div>
      <div className="mt-3 max-h-80 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="h-8 font-mono text-xs tracking-[0.2em] text-white/55 uppercase">
                Time
              </TableHead>
              <TableHead className="h-8 font-mono text-xs tracking-[0.2em] text-white/55 uppercase">
                Action
              </TableHead>
              <TableHead className="hidden h-8 font-mono text-xs tracking-[0.2em] text-white/55 uppercase md:table-cell">
                Target
              </TableHead>
              <TableHead className="h-8 font-mono text-xs tracking-[0.2em] text-white/55 uppercase">
                Meta
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audit.map((a) => {
              const d = new Date(a.at);
              return (
                <TableRow key={a.id} className="border-white/[0.06]">
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-ember/20 bg-ember/10 font-mono text-xs font-bold text-ember uppercase"
                      >
                        {(a.entity || a.action).slice(0, 1)}
                      </span>
                      <span className="whitespace-nowrap font-mono text-xs text-white/60">
                        {d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                        {" · "}
                        {d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className="whitespace-nowrap rounded bg-ember/10 px-1.5 py-0.5 font-mono text-xs text-ember">
                      {a.action}
                    </span>
                  </TableCell>
                  <TableCell className="hidden py-2.5 font-mono text-xs text-white/50 md:table-cell">
                    {a.entity}
                    {a.entityId ? `…${a.entityId.slice(-4)}` : ""}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate py-2.5 text-xs text-white/60">
                    {a.meta || "—"}
                  </TableCell>
                </TableRow>
              );
            })}
            {audit.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-white/55">
                  No admin actions recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Panel>
  );
}

const QUEUE_SLA_H = 14;

function QueueAgingCard({ oldest, ageH }: { oldest: string | null; ageH: number }) {
  const pct = Math.min(100, Math.round((ageH / QUEUE_SLA_H) * 100));
  return (
    <Panel>
      <div className="flex items-center justify-between gap-2">
        <p className={labelCx}>Queue aging</p>
        {oldest && ageH > QUEUE_SLA_H && (
          <span className="rounded-full bg-red-400/10 px-2 py-0.5 font-mono text-xs tracking-wider text-red-400/80 uppercase">
            past SLA
          </span>
        )}
      </div>
      {oldest ? (
        <>
          <p className="mt-3 text-3xl font-black tracking-tight text-white">
            {ageH}
            <span className="ml-1 text-base font-bold text-white/60">h</span>
          </p>
          <p className="mt-1 truncate text-xs text-white/50">
            oldest pending · <span className="text-white/80">{oldest}</span>
          </p>
          <Progress
            value={pct}
            aria-label={`Oldest pending submission: ${ageH} hours of the ${QUEUE_SLA_H} hour SLA`}
            className="mt-4 h-1.5 bg-white/10 [&_[data-slot=progress-indicator]]:bg-ember"
          />
          <p className="mt-2 font-mono text-xs text-white/55">
            SLA {QUEUE_SLA_H}h · {pct}% elapsed
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center py-8 text-center">
          <CheckCircle2 className="size-8 text-emerald-400" aria-hidden />
          <p className="mt-2.5 font-mono text-sm text-white/60">Queue clear</p>
          <p className="mt-1 text-xs text-white/55">Nothing waiting on review.</p>
        </div>
      )}
    </Panel>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl bg-white/[0.04] lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl bg-white/[0.04]" />
      </div>
    </div>
  );
}

function OverviewView({ data, apiKey }: { data: Overview; apiKey: string }) {
  const k = data.kpis;
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* KPI row — reference layout: stat cards with delta pills (2 rows of 4) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Listings live"
          value={k.toolsLive}
          delta={computeDelta(data.listingsByDay[13] ?? 0, data.listingsByDay[12] ?? 0)}
          spark={data.listingsByDay}
          caption={`across ${k.categories} categories`}
        />
        <StatCard
          label="Pending submissions"
          value={k.pendingSubs}
          accent={k.pendingSubs > 0}
          caption={
            k.pendingSubs > 0 && data.oldestPending
              ? `oldest · ${data.oldestPending} · ${data.queueAgeH}h`
              : "queue clear"
          }
        />
        <StatCard
          label="Reviews published"
          value={k.reviewsPublished}
          delta={computeDelta(data.reviewsByDay[13] ?? 0, data.reviewsByDay[12] ?? 0)}
          spark={data.reviewsByDay}
        />
        <StatCard label="Comments" value={k.comments} />
        <StatCard label="Pageviews today" value={k.pageviewsToday} />
        <StatCard
          label="Ad impressions"
          value={k.adImpressions}
          caption={`${k.adClicks} clicks · ${k.adsActive} campaigns active`}
        />
        <StatCard label="Journal posts" value={k.postsPublished} caption="published" />
        <StatCard
          label="Open reports"
          value={k.reportsOpen}
          accent={k.reportsOpen > 0}
          caption={k.reportsOpen > 0 ? "needs moderation" : "all clear"}
        />
      </div>

      {/* Charts row — listings & reviews trends + mix breakdowns */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <TrendChartCard label="Listings" noun="listing" byDay={data.listingsByDay} />
        <TrendChartCard label="Reviews" noun="review" byDay={data.reviewsByDay} />
        <CategoryMixCard mix={data.categoryMix} />
        <PricingDonutCard mix={data.pricingMix} />
      </div>

      {/* Table row — audit trail + queue aging side card */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        <ActivityCard audit={data.audit} className="lg:col-span-2" />
        <QueueAgingCard oldest={data.oldestPending} ageH={data.queueAgeH} />
      </div>

      {/* First-party traffic readout (Task 28) — the numbers that back the
          ad-network application and the direct-sales pitch */}
      <TrafficCard apiKey={apiKey} />
    </div>
  );
}

// ── Overview: first-party traffic (Task 28) ───────────────────────────

type Traffic = {
  days: { day: string; views: number }[];
  total: number;
  top: { path: string; views: number }[];
};

/**
 * Traffic — 14-day cookieless pageview trend + top paths, straight from
 * PageViewDaily (path × UTC day counters; no cookies/IPs/UA stored, which
 * is the privacy stance we sell to networks and advertisers). Self-fetching
 * so the overview payload stays untouched.
 */
function TrafficCard({ apiKey }: { apiKey: string }) {
  const [traffic, setTraffic] = useState<Traffic | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    adminFetch(apiKey, "/api/admin/analytics")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<Traffic>;
      })
      .then((d) => {
        setTraffic(d);
        setError(false);
      })
      .catch(() => setError(true));
  }, [apiKey]);

  useEffect(load, [load]);

  const max = traffic ? Math.max(1, ...traffic.days.map((d) => d.views)) : 1;
  const today = traffic?.days[traffic.days.length - 1]?.views ?? 0;
  const yesterday = traffic?.days[traffic.days.length - 2]?.views ?? 0;

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={labelCx}>Traffic, last 14 days</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60">
            {traffic ? `${traffic.total.toLocaleString("en-US")} views` : "…"}
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 font-mono text-xs",
              today >= yesterday
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                : "border-white/10 bg-white/5 text-white/50"
            )}
            title="Today vs yesterday (UTC)"
          >
            {today >= yesterday ? "↑" : "↓"} {today} today
          </span>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-400/25 bg-red-400/[0.04] p-5 text-center">
          <p className="font-mono text-xs tracking-wider text-red-300 uppercase">
            Traffic readout unavailable
          </p>
          <Button
            size="sm"
            onClick={load}
            className="mt-3 rounded-lg border border-white/15 bg-transparent font-mono text-sm tracking-wider text-white/70 uppercase hover:bg-white/5"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Retry
          </Button>
        </div>
      ) : !traffic ? (
        <div className="mt-5 space-y-2">
          <Skeleton className="h-24 rounded-xl bg-white/[0.04]" />
          <Skeleton className="h-16 rounded-xl bg-white/[0.04]" />
        </div>
      ) : (
        <>
          <div
            role="img"
            aria-label={`Pageviews per day over the last 14 days, ${traffic.total} total`}
            className="mt-5 flex h-24 items-end gap-1.5 border-b border-white/10 pb-px"
          >
            {traffic.days.map((d, i) => (
              <div
                key={d.day}
                title={`${d.day} · ${d.views} view${d.views === 1 ? "" : "s"}`}
                className="group flex h-full flex-1 items-end"
              >
                <span
                  className={cn(
                    "w-full rounded-t-[3px] transition-colors",
                    i === traffic.days.length - 1
                      ? "bg-ember"
                      : "bg-white/15 group-hover:bg-white/30"
                  )}
                  style={{ height: `${Math.max(3, Math.round((d.views / max) * 100))}%` }}
                />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <p className="font-mono text-xs tracking-[0.2em] text-white/60 uppercase">
              Top paths
            </p>
            <ul className="mt-2 space-y-1">
              {traffic.top.map((t) => (
                <li
                  key={t.path}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-white/70">
                    {t.path}
                  </span>
                  <span
                    aria-hidden
                    className="h-1 w-24 shrink-0 overflow-hidden rounded-full bg-white/10"
                  >
                    <span
                      className="block h-full rounded-full bg-ember/70"
                      style={{
                        width: `${Math.max(
                          4,
                          Math.round((t.views / Math.max(1, traffic.top[0].views)) * 100)
                        )}%`,
                      }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-white/50">
                    {t.views.toLocaleString("en-US")}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-3 font-mono text-xs leading-relaxed text-white/55">
            COOKIELESS FIRST-PARTY COUNTING (PATH × DAY, NO COOKIES, IPS OR
            FINGERPRINTS) · ADMIN/API/EDITOR SURFACES EXCLUDED
          </p>
        </>
      )}
    </Panel>
  );
}

// ── Shell: navigation config ─────────────────────────────────────────────

type SectionId =
  | "overview"
  | "submissions"
  | "tools"
  | "categories"
  | "users"
  | "reports"
  | "journal"
  | "media"
  | "ads"
  | "settings";

const NAV_GROUPS: { label: string; items: { id: SectionId; label: string; icon: LucideIcon }[] }[] = [
  {
    label: "Overview",
    items: [{ id: "overview", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Manage",
    items: [
      { id: "submissions", label: "Submissions", icon: ListChecks },
      { id: "tools", label: "Listings", icon: Database },
      { id: "categories", label: "Categories", icon: Tags },
      { id: "users", label: "Users", icon: Users },
      { id: "reports", label: "Reports", icon: Flag },
    ],
  },
  {
    label: "Content",
    items: [
      { id: "journal", label: "Journal", icon: FileText },
      { id: "media", label: "Media", icon: Images },
    ],
  },
  {
    label: "Growth",
    items: [{ id: "ads", label: "Advertising", icon: Megaphone }],
  },
  {
    label: "Config",
    items: [{ id: "settings", label: "Settings", icon: SettingsIcon }],
  },
];

const SECTION_TITLES: Record<SectionId, string> = {
  overview: "Overview",
  submissions: "Submissions",
  tools: "Listings",
  categories: "Categories",
  users: "Users",
  reports: "Reports",
  journal: "Journal",
  media: "Media library",
  ads: "Advertising",
  settings: "Site settings",
};

const SECTION_NOTES: Record<SectionId, string> = {
  overview: "Directory growth, moderation load, first-party traffic and the live audit trail.",
  submissions: "Community queue: approval publishes the listing, rejections cite standards.",
  tools: "Every listing: edit copy, pricing, status, pins and verification.",
  categories: "Primary taxonomy: names, emoji, slugs, tool counts.",
  users: "Community roster: roles, bans and activity. Sessions revoke on ban.",
  reports: "Community moderation queue: hide content, resolve or dismiss with a note.",
  journal: "SEO workhorse: markdown posts with drafts, SERP preview and views.",
  media: "Uploaded images and videos: copy URLs, attach to listings or posts, delete safely.",
  ads: "Sponsored campaigns: placements, flights, budgets and CTR.",
  settings: "KV site copy: hero, announcement, footer, SEO defaults. No deploys.",
};

// ── Shell: sidebar ───────────────────────────────────────────────────────

function SidebarContent({
  section,
  onNavigate,
  pending,
}: {
  section: SectionId;
  onNavigate: (id: SectionId) => void;
  pending: number;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !needle || i.label.toLowerCase().includes(needle)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      {/* logo row */}
      <a
        href="/"
        className="flex shrink-0 items-center gap-2.5 rounded-lg px-1 py-1"
        aria-label="Back to the Prother home page"
      >
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-lg border border-ember/30 bg-ember/15"
        >
          <Hexagon className="size-4 text-ember" />
        </span>
        <span className="text-base font-black tracking-tight text-white">Prother</span>
        <span className="rounded border border-ember/30 bg-ember/10 px-1.5 py-px font-mono text-xs tracking-[0.2em] text-ember">
          ADMIN
        </span>
      </a>

      {/* jump-to search (filters nav) */}
      <div className="relative mt-4 shrink-0">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/55"
          aria-hidden
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Jump to…"
          aria-label="Filter admin sections"
          className="h-9 border-white/10 bg-white/5 pl-8 pr-10 text-sm text-white placeholder:text-white/55"
        />
        <kbd
          aria-hidden
          title="Filters the sections below"
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-white/10 bg-white/5 px-1 font-mono text-xs text-white/55"
        >
          ⌘K
        </kbd>
      </div>

      {/* grouped nav */}
      <nav aria-label="Admin sections" className="mt-5 flex-1 space-y-5">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="px-2 pb-1.5 font-mono text-xs tracking-[0.2em] text-white/55 uppercase">
              {g.label}
            </p>
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-ember/10 text-ember"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-ember"
                      />
                    )}
                    <item.icon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>
                    {item.id === "submissions" && pending > 0 && (
                      <span className="ml-auto rounded-full bg-ember px-1.5 py-px font-mono text-xs font-bold text-coal">
                        {pending}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="px-2 py-4 font-mono text-xs tracking-wider text-white/55 uppercase">
            No section matches “{q.trim()}”
          </p>
        )}
      </nav>

      {/* promo card — honest pointer to the home-page editor desk */}
      <div className="mt-5 shrink-0 rounded-xl border border-ember/25 bg-ember/[0.06] p-3.5">
        <p className="font-mono text-xs tracking-[0.25em] text-ember uppercase">
          Editor desk
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-white/55">
          Claims arbitration &amp; filtered-review moderation run on the home
          page review desk.
        </p>
        <a
          href="/"
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-ember/40 bg-ember/10 px-2.5 py-1.5 font-mono text-sm tracking-[0.15em] text-ember uppercase transition-colors hover:bg-ember/20"
        >
          Open on home
        </a>
        <p className="mt-2 text-center font-mono text-xs text-white/55">
          or press ⌘⇧E on the home page
        </p>
      </div>
    </div>
  );
}

// ── Shell: the dashboard ─────────────────────────────────────────────────

export function AdminDashboard() {
  const { toast } = useToast();
  const { key, unlock, lock } = useAdminKey();
  const [section, setSection] = useState<SectionId>("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewError, setOverviewError] = useState(false);

  const loadOverview = useCallback(() => {
    adminFetch(key ?? "", "/api/admin/overview")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: Overview) => {
        setOverview(d);
        setOverviewError(false);
      })
      .catch(() => setOverviewError(true));
  }, [key]);

  useEffect(() => {
    if (key) loadOverview();
  }, [key, loadOverview]);

  const bumpOverview = loadOverview;

  const onNavigate = useCallback((id: SectionId) => {
    setSection(id);
    setNavOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const onLock = useCallback(() => {
    lock();
    toast({ title: "Locked", description: "Admin session ended." });
  }, [lock, toast]);

  const retryOverview = useCallback(() => {
    setOverview(null);
    setOverviewError(false);
    loadOverview();
  }, [loadOverview]);

  // Journal previews live on the landing page's deep-link stack — open a tab.
  const previewPost = useCallback((slug: string) => {
    window.open(`/journal/${encodeURIComponent(slug)}`, "_blank", "noopener");
  }, []);

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="mx-auto flex w-full max-w-[1440px]">
        {/* desktop sidebar */}
        <aside
          aria-label="Admin sidebar"
          className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-white/10 bg-coal lg:block"
        >
          <SidebarContent
            section={section}
            onNavigate={onNavigate}
            pending={overview?.kpis.pendingSubs ?? 0}
          />
        </aside>

        {/* mobile sidebar */}
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent
            side="left"
            className="w-[276px] border-white/10 bg-coal p-0 text-white sm:max-w-[276px]"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Admin navigation</SheetTitle>
              <SheetDescription>Move between admin sections.</SheetDescription>
            </SheetHeader>
            <SidebarContent
              section={section}
              onNavigate={onNavigate}
              pending={overview?.kpis.pendingSubs ?? 0}
            />
          </SheetContent>
        </Sheet>

        {/* main column */}
        <div className="min-w-0 flex-1">
          {/* topbar */}
          <header className="sticky top-16 z-30 border-b border-white/10 bg-ink/90 px-4 py-3.5 backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setNavOpen(true)}
                aria-label="Open admin navigation"
                aria-expanded={navOpen}
                className="size-9 shrink-0 rounded-lg text-white/70 hover:bg-white/5 hover:text-white lg:hidden"
              >
                <Menu className="size-4.5" aria-hidden />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs tracking-[0.3em] text-ember uppercase">
                  Prother admin
                </p>
                <h1 className="truncate text-xl font-black tracking-tight text-white sm:text-2xl">
                  {SECTION_TITLES[section]}
                </h1>
              </div>
              <span
                aria-live="polite"
                className={cn(
                  "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs tracking-[0.2em] uppercase sm:inline-flex",
                  key
                    ? "border-ember/30 bg-ember/10 text-ember"
                    : "border-white/10 bg-white/5 text-white/60"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    key ? "animate-status-pulse bg-ember" : "bg-white/30"
                  )}
                />
                {key ? "Key active" : "Locked"}
              </span>
              {key && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onLock}
                  className="h-9 shrink-0 rounded-lg border-white/15 px-3 text-white/70 shadow-none hover:bg-white/5 hover:text-white"
                >
                  <KeyRound className="size-3.5" aria-hidden />
                  <span className="hidden sm:inline">Lock</span>
                  <span className="sr-only sm:hidden">Lock console</span>
                </Button>
              )}
            </div>
          </header>

          {/* content */}
          <main className="px-4 py-5 sm:px-6 sm:py-6">
            {!key ? (
              <Gate onUnlock={unlock} />
            ) : section === "overview" ? (
              <section aria-label="Overview" className="space-y-3">
                <p className="font-mono text-xs tracking-wider text-white/55 uppercase">
                  {SECTION_NOTES.overview}
                </p>
                {overviewError ? (
                  <div className="rounded-2xl border border-red-400/25 bg-red-400/[0.04] p-10 text-center">
                    <p className="font-mono text-xs tracking-[0.25em] text-red-300 uppercase">
                      Overview unavailable
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-white/60">
                      Couldn&apos;t load dashboard data. Check the admin key or
                      network, then retry.
                    </p>
                    <Button
                      onClick={retryOverview}
                      className="mt-5 rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal"
                    >
                      <RotateCcw className="size-4" aria-hidden />
                      Retry
                    </Button>
                  </div>
                ) : overview ? (
                  <OverviewView data={overview} apiKey={key} />
                ) : (
                  <OverviewSkeleton />
                )}
              </section>
            ) : (
              <section aria-label={SECTION_TITLES[section]} className="space-y-3">
                <p className="font-mono text-xs tracking-wider text-white/55 uppercase">
                  {SECTION_NOTES[section]}
                </p>
                <Panel>
                  {section === "submissions" && (
                    <QueueTab apiKey={key} onChanged={bumpOverview} />
                  )}
                  {section === "tools" && (
                    <ListingsTab apiKey={key} onChanged={bumpOverview} />
                  )}
                  {section === "categories" && (
                    <TaxonomyTab apiKey={key} onChanged={bumpOverview} />
                  )}
                  {section === "users" && (
                    <UsersTab apiKey={key} onChanged={bumpOverview} />
                  )}
                  {section === "reports" && (
                    <ReportsTab apiKey={key} onChanged={bumpOverview} />
                  )}
                  {section === "journal" && (
                    <BlogTab
                      apiKey={key}
                      onChanged={bumpOverview}
                      onPreview={previewPost}
                    />
                  )}
                  {section === "media" && (
                    <AdminMediaTab apiKey={key} onChanged={bumpOverview} />
                  )}
                  {section === "ads" && (
                    <AdsTab apiKey={key} onChanged={bumpOverview} />
                  )}
                  {section === "settings" && (
                    <SettingsTab apiKey={key} onChanged={bumpOverview} />
                  )}
                </Panel>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/**
 * Deprecated — the admin console is a real route now (/admin, Task 20-c).
 * Kept as an explicit no-op so the landing page's legacy <AdminConsole />
 * mount stays harmless until the site-chrome pass removes it.
 */
export function AdminConsole() {
  return null;
}
