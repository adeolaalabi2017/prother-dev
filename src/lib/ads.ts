/**
 * Advertising — campaign management + serving for the placements
 * sold on /advertise: directory_banner (sponsored row in the tools
 * directory), journal_bar, category_spotlight, serp_footer.
 *
 * Serving picks a weighted-random ACTIVE campaign whose flight window covers
 * "now" (and whose total budget, when set, isn't exhausted by impressions ×
 * assumed $8 CPM... no — budgets gate on impressions alone: 1000 impressions
 * per totalBudgetCents/CPM_CENTS; see eligibleWhere). Impressions/clicks are
 * counters on the row; CTR computed on read.
 *
 * $queryRaw is deliberate (stale-PrismaClient case — see lib/forum.ts).
 */
import { db } from "@/lib/db";

export const AD_PLACEMENTS = [
  "journal_bar",
  "category_spotlight",
  "directory_banner",
  "serp_footer",
] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const AD_STATUSES = ["draft", "active", "paused", "ended"] as const;
export type AdStatus = (typeof AD_STATUSES)[number];

/** Assumed CPM basis for budget pacing: totalBudgetCents / 10 = impressions. */
const CPM_CENTS = 10; // $0.10 CPM demo economics → 1 cent = 100 impressions

export type AdCampaignRow = {
  id: string;
  name: string;
  advertiser: string;
  placement: AdPlacement;
  status: AdStatus;
  headline: string;
  body: string;
  clickUrl: string;
  emoji: string;
  gradient: string;
  targetCategory: string | null;
  weight: number;
  startsAt: string | null;
  endsAt: string | null;
  totalBudgetCents: number;
  dailyBudgetCents: number;
  impressions: number;
  clicks: number;
  /** MRC viewable impressions (≥50% on screen ≥1s) — see lib/ad-measure.ts. */
  viewableImpressions: number;
  ctr: number; // percent, 1 decimal
  /** Viewable rate: viewableImpressions / impressions, percent, 1 decimal. */
  vRate: number;
  windowState: "scheduled" | "running" | "finished" | "none";
};

export type AdListResponse = {
  campaigns: AdCampaignRow[];
  stats: {
    total: number;
    active: number;
    impressions: number;
    clicks: number;
    ctr: number;
  };
};

function toIso(v: number | string | null): string | null {
  if (v == null) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function windowState(startsAt: string | null, endsAt: string | null): AdCampaignRow["windowState"] {
  if (!startsAt && !endsAt) return "none";
  const now = Date.now();
  const start = startsAt ? new Date(startsAt).getTime() : null;
  const end = endsAt ? new Date(endsAt).getTime() : null;
  if (start && now < start) return "scheduled";
  if (end && now > end) return "finished";
  return "running";
}

function mapCampaign(r: {
  id: string;
  name: string;
  advertiser: string;
  placement: string;
  status: string;
  headline: string;
  body: string;
  clickUrl: string;
  emoji: string;
  gradient: string;
  targetCategory: string | null;
  weight: number | bigint;
  startsAt: number | string | null;
  endsAt: number | string | null;
  totalBudgetCents: number | bigint;
  dailyBudgetCents: number | bigint;
  impressions: number | bigint;
  clicks: number | bigint;
  viewableImpressions: number | bigint;
}): AdCampaignRow {
  const impressions = Number(r.impressions);
  const clicks = Number(r.clicks);
  const startsAt = toIso(r.startsAt);
  const endsAt = toIso(r.endsAt);
  return {
    id: r.id,
    name: r.name,
    advertiser: r.advertiser,
    placement: (AD_PLACEMENTS.includes(r.placement as AdPlacement)
      ? r.placement
      : "directory_banner") as AdPlacement,
    status: (AD_STATUSES.includes(r.status as AdStatus)
      ? r.status
      : "draft") as AdStatus,
    headline: r.headline,
    body: r.body,
    clickUrl: r.clickUrl,
    emoji: r.emoji,
    gradient: r.gradient,
    targetCategory: r.targetCategory,
    weight: Number(r.weight),
    startsAt,
    endsAt,
    totalBudgetCents: Number(r.totalBudgetCents),
    dailyBudgetCents: Number(r.dailyBudgetCents),
    impressions,
    clicks,
    viewableImpressions: Number(r.viewableImpressions ?? 0),
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
    vRate:
      impressions > 0
        ? Math.round((Number(r.viewableImpressions ?? 0) / impressions) * 1000) / 10
        : 0,
    windowState: windowState(startsAt, endsAt),
  };
}

export async function listCampaigns(): Promise<AdListResponse> {
  const rows = await db.$queryRaw<
    Parameters<typeof mapCampaign>[0][]
  >`
    SELECT id, name, advertiser, placement, status, headline, body, clickUrl,
           emoji, gradient, targetCategory, weight, startsAt, endsAt,
           totalBudgetCents, dailyBudgetCents, impressions, clicks,
           "viewableImpressions"
    FROM AdCampaign
    ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END,
             createdAt DESC
    LIMIT 200`;

  const campaigns = rows.map(mapCampaign);
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  return {
    campaigns,
    stats: {
      total: campaigns.length,
      active: campaigns.filter((c) => c.status === "active").length,
      impressions,
      clicks,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
    },
  };
}

export async function createCampaign(input: {
  name: string;
  advertiser: string;
  placement: AdPlacement;
  headline: string;
  body?: string;
  clickUrl: string;
  emoji?: string;
  gradient?: string;
  targetCategory?: string | null;
  weight?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  totalBudgetCents?: number;
  dailyBudgetCents?: number;
  status?: AdStatus;
  /** Dual-write overrides (Phase 4 step 6) — shared id/timestamps. */
  id?: string;
  createdAt?: number;
  updatedAt?: number;
}): Promise<{ id: string }> {
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  await db.$executeRaw`
    INSERT INTO AdCampaign (
      id, name, advertiser, placement, status, headline, body, clickUrl,
      emoji, gradient, targetCategory, weight, startsAt, endsAt,
      totalBudgetCents, dailyBudgetCents, impressions, clicks, createdAt, updatedAt
    ) VALUES (
      ${id}, ${input.name}, ${input.advertiser}, ${input.placement},
      ${input.status ?? "draft"}, ${input.headline}, ${input.body ?? ""},
      ${input.clickUrl}, ${input.emoji ?? "📣"},
      ${input.gradient ?? "from-orange-500 to-amber-700"},
      ${input.targetCategory ?? null}, ${input.weight ?? 1},
      ${input.startsAt ?? null}, ${input.endsAt ?? null},
      ${input.totalBudgetCents ?? 0}, ${input.dailyBudgetCents ?? 0},
      0, 0, ${input.createdAt ? new Date(input.createdAt).toISOString() : now}, ${input.updatedAt ? new Date(input.updatedAt).toISOString() : now}
    )`;
  return { id };
}

export async function updateCampaign(
  id: string,
  patch: Partial<{
    name: string;
    advertiser: string;
    placement: AdPlacement;
    status: AdStatus;
    headline: string;
    body: string;
    clickUrl: string;
    emoji: string;
    gradient: string;
    targetCategory: string | null;
    weight: number;
    startsAt: string | null;
    endsAt: string | null;
    totalBudgetCents: number;
    dailyBudgetCents: number;
  }>
): Promise<{ ok: boolean }> {
  const sets: string[] = ['"updatedAt" = ?'];
  const values: unknown[] = [new Date().toISOString()];
  const stringCols = [
    "name", "advertiser", "placement", "status", "headline", "body",
    "clickUrl", "emoji", "gradient",
  ] as const;
  for (const col of stringCols) {
    const v = patch[col];
    if (v !== undefined) { sets.push(`"${col}" = ?`); values.push(v); }
  }
  const nullableStrings = ["targetCategory", "startsAt", "endsAt"] as const;
  for (const col of nullableStrings) {
    const v = patch[col];
    if (v !== undefined) { sets.push(`"${col}" = ?`); values.push(v); }
  }
  const numberCols = [
    "weight", "totalBudgetCents", "dailyBudgetCents",
  ] as const;
  for (const col of numberCols) {
    const v = patch[col];
    if (v !== undefined) { sets.push(`"${col}" = ?`); values.push(v); }
  }

  const res = await db.$executeRawUnsafe(
    `UPDATE AdCampaign SET ${sets.join(", ")} WHERE "id" = ?`,
    ...values, id
  );
  return { ok: res > 0 };
}

export async function deleteCampaign(id: string): Promise<{ ok: boolean }> {
  const res = await db.$executeRaw`DELETE FROM AdCampaign WHERE id = ${id}`;
  return { ok: res > 0 };
}

// ── Serving ───────────────────────────────────────────────────────────────

type ServeRow = {
  id: string;
  name: string;
  headline: string;
  body: string;
  clickUrl: string;
  emoji: string;
  gradient: string;
  advertiser: string;
  targetCategory: string | null;
  weight: number | bigint;
  viewableImpressions: number | bigint;
};

/**
 * Weighted-random pick among ACTIVE campaigns in flight for a placement.
 * Budget gate: when totalBudgetCents > 0, impressions must stay under
 * (totalBudgetCents / CPM_CENTS) * 1000. Never throws — a failing ad server
 * must not break the page.
 */
export async function serveAd(
  placement: AdPlacement,
  category?: string | null
): Promise<{ ad: Omit<AdCampaignRow, "clickUrl"> & { clickUrl: string } } | null> {
  try {
    const rows = await db.$queryRaw<ServeRow[]>`
      SELECT id, name, headline, body, clickUrl, emoji, gradient, advertiser,
             targetCategory, weight, "viewableImpressions"
      FROM AdCampaign
      WHERE status = 'active'
        AND placement = ${placement}
        AND (targetCategory IS NULL OR targetCategory = ${category ?? ""})
        AND (startsAt IS NULL OR startsAt <= ${new Date().toISOString()})
        AND (endsAt IS NULL OR endsAt >= ${new Date().toISOString()})
        AND (totalBudgetCents = 0
             OR impressions < (totalBudgetCents * 1000.0 / ${CPM_CENTS}))`;

    if (rows.length === 0) return null;

    // Weighted random.
    const weights = rows.map((r) => Math.max(1, Number(r.weight) || 1));
    const total = weights.reduce((s, w) => s + w, 0);
    let roll = Math.random() * total;
    let picked = rows[0];
    for (let i = 0; i < rows.length; i++) {
      roll -= weights[i];
      if (roll <= 0) { picked = rows[i]; break; }
    }

    // Fire-and-forget impression counter.
    db.$executeRaw`UPDATE AdCampaign SET impressions = impressions + 1 WHERE id = ${picked.id}`
      .catch(() => {});

    const mapped = mapCampaign({ ...picked, status: "active", placement, startsAt: null, endsAt: null, totalBudgetCents: 0, dailyBudgetCents: 0, impressions: 0, clicks: 0, viewableImpressions: picked.viewableImpressions ?? 0 });
    return { ad: mapped };
  } catch {
    return null;
  }
}

export async function recordClick(id: string): Promise<string | null> {
  const rows = await db.$queryRaw<{ clickUrl: string }[]>`
    UPDATE AdCampaign SET clicks = clicks + 1
    WHERE id = ${id}
    RETURNING clickUrl`;
  return rows[0]?.clickUrl ?? null;
}
