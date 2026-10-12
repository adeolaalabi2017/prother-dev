/**
 * D1 ports of convex/adminCrud.ts — admin console slice 1 (wave 4c).
 *
 * Entities: tools, categories, posts, site settings, ad campaigns,
 * integrations. Writes AND their paired console-table reads lead D1
 * together per entity, so the admin console never shows a stale row
 * right after an edit. Moderation (usersTable/reportsTable/userModerate/
 * reportResolve) deliberately stays Convex-first until its slice; the
 * admin overview aggregate also stays Convex (visual-only lag is
 * annotated in the UI docs).
 *
 * Conventions (mirror convex/adminCrud.ts):
 * - docId(row) = legacyId ?? id — lookups accept either id shape.
 * - Errors thrown from here that DO NOT fall through: slug_taken,
 *   not_found, category_not_found, has_tools:N (data.ts hard-lists them;
 *   falling back would re-apply the same edit on Convex and mask a real
 *   collision).
 * - Timestamps cross the wire as ISO strings; D1 stores epoch ms INT.
 * - Route-side ids/timestamps are trusted (generated once, passed in).
 */
import { asc, desc, eq, or, sql } from "drizzle-orm";
import { getD1 } from "./client";
import {
  adCampaigns,
  categories,
  integrations,
  posts,
  siteSettings,
  tools,
} from "./schema";

type DB = NonNullable<Awaited<ReturnType<typeof getD1>>>;
type ToolRow = typeof tools.$inferSelect;

function docId(d: { id: string; legacyId: string | null }): string {
  return d.legacyId ?? d.id;
}

/** Resolves a row by either id shape (legacy cuid or pk). */
async function byEitherId<T extends { id: string; legacyId: string | null }>(
  db: DB,
  table:
    | typeof tools
    | typeof categories
    | typeof posts
    | typeof adCampaigns,
  x: string,
): Promise<T | null> {
  const [row] = await db
    .select()
    .from(table)
    .where(or(eq(table.legacyId, x), eq(table.id, x)))
    .limit(1);
  return (row as T) ?? null;
}

// ── Editorial (verbatim port of applyEditorial in convex/adminCrud.ts) ──

type Editorial = {
  longDescription?: string | null;
  useCases?: { title: string; body: string }[];
  pros?: string[];
  cons?: string[];
  alternatives?: string[];
  pricingChecked?: boolean;
};

function applyEditorial(
  current: {
    longDescription: string | null;
    useCasesJson: string;
    prosJson: string;
    consJson: string;
    alternativesJson: string;
    pricingCheckedAt: number | null;
    contentUpdatedAt: number | null;
  },
  patch: Editorial,
  nowMs: number,
): boolean {
  let touched = false;
  if (patch.longDescription !== undefined) {
    current.longDescription = (patch.longDescription ?? "").trim() || null;
    touched = true;
  }
  if (patch.useCases !== undefined) {
    current.useCasesJson = JSON.stringify(patch.useCases);
    touched = true;
  }
  if (patch.pros !== undefined) {
    current.prosJson = JSON.stringify(patch.pros);
    touched = true;
  }
  if (patch.cons !== undefined) {
    current.consJson = JSON.stringify(patch.cons);
    touched = true;
  }
  if (patch.alternatives !== undefined) {
    current.alternativesJson = JSON.stringify(patch.alternatives);
    touched = true;
  }
  if (patch.pricingChecked !== undefined) {
    current.pricingCheckedAt = patch.pricingChecked ? nowMs : null;
    touched = true;
  }
  if (touched) current.contentUpdatedAt = nowMs;
  return touched;
}

// ── Tools ────────────────────────────────────────────────────────────────

export async function d1ToolCreate(args: {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description?: string;
  websiteUrl: string;
  categoryLegacyId: string;
  pricingModel: string;
  startingPrice?: string;
  pricingNote?: string;
  hasApi: boolean;
  logoEmoji: string;
  logoGradient: string;
  tagsPipe: string;
  makerHandle: string;
  status: string;
  editorsPick: boolean;
  curated: boolean;
  logoUrl?: string | null;
  screenshotUrls?: string[];
  editorial?: Editorial;
  features?: Record<string, string>;
  createdAt: number;
}) {
  const db = await getD1();
  if (!db) return null;
  const [dupe] = await db.select({ id: tools.id }).from(tools).where(eq(tools.slug, args.slug)).limit(1);
  if (dupe) throw new Error("slug_taken");
  const cat = await byEitherId<typeof categories.$inferSelect>(db, categories, args.categoryLegacyId);
  if (!cat) throw new Error("category_not_found");
  const nowMs = args.createdAt;
  const editorial = {
    longDescription: null,
    useCasesJson: "[]",
    prosJson: "[]",
    consJson: "[]",
    alternativesJson: "[]",
    pricingCheckedAt: null as number | null,
    contentUpdatedAt: null as number | null,
  };
  if (args.editorial) applyEditorial(editorial, args.editorial, nowMs);
  await db.insert(tools).values({
    id: crypto.randomUUID(),
    slug: args.slug,
    name: args.name,
    tagline: args.tagline,
    description: args.description ?? null,
    websiteUrl: args.websiteUrl,
    logoEmoji: args.logoEmoji,
    logoGradient: args.logoGradient,
    logoUrl: args.logoUrl ?? null,
    screenshotUrlsJson: JSON.stringify(args.screenshotUrls ?? []),
    longDescription: editorial.longDescription,
    useCasesJson: editorial.useCasesJson,
    prosJson: editorial.prosJson,
    consJson: editorial.consJson,
    alternativesJson: editorial.alternativesJson,
    pricingCheckedAt: editorial.pricingCheckedAt,
    contentUpdatedAt: editorial.contentUpdatedAt,
    pricingModel: args.pricingModel,
    startingPrice: args.startingPrice ?? null,
    pricingNote: args.pricingNote ?? null,
    hasApi: args.hasApi ? 1 : 0,
    tagsJson: JSON.stringify(
      args.tagsPipe.split("|").map((t) => t.trim()).filter(Boolean),
    ),
    featuresJson: JSON.stringify(args.features ?? {}),
    track: "editor_seed",
    editorsPick: args.editorsPick ? 1 : 0,
    curated: args.curated ? 1 : 0,
    claimed: 0,
    makerHandle: args.makerHandle,
    status: args.status,
    pinned: 0,
    categoryId: cat.id,
    submissionId: null,
    commentCount: 0,
    reviewCount: 0,
    ratingSumX100: 0,
    legacyId: args.id,
    createdAt: args.createdAt,
  });
  return { id: args.id, slug: args.slug };
}

export async function d1ToolPatch(args: {
  toolLegacyId: string;
  data: {
    name?: string;
    tagline?: string;
    description?: string | null;
    websiteUrl?: string;
    logoEmoji?: string;
    logoGradient?: string;
    pricingModel?: string;
    startingPrice?: string | null;
    pricingNote?: string | null;
    hasApi?: boolean;
    githubUrl?: string | null;
    docsUrl?: string | null;
    twitterUrl?: string | null;
    tagsPipe?: string;
    tags?: string;
    status?: string;
    pinned?: number;
    editorsPick?: boolean;
    curated?: boolean;
    claimed?: boolean;
    makerHandle?: string;
    categoryLegacyId?: string;
    categoryId?: string;
    verifiedAt?: number;
  };
  features?: Record<string, string>;
  logoUrl?: string | null;
  screenshotUrls?: string[];
  editorial?: Editorial;
  nowMs: number;
}) {
  const db = await getD1();
  if (!db) return null;
  const tool = await byEitherId<ToolRow>(db, tools, args.toolLegacyId);
  if (!tool) return null;
  const patch: Partial<typeof tools.$inferInsert> = {};
  const d = args.data;
  if (d.name !== undefined) patch.name = d.name;
  if (d.tagline !== undefined) patch.tagline = d.tagline;
  if (d.description !== undefined) patch.description = d.description ?? null;
  if (d.websiteUrl !== undefined) patch.websiteUrl = d.websiteUrl;
  if (d.logoEmoji !== undefined) patch.logoEmoji = d.logoEmoji;
  if (d.logoGradient !== undefined) patch.logoGradient = d.logoGradient;
  if (d.pricingModel !== undefined) patch.pricingModel = d.pricingModel;
  if (d.startingPrice !== undefined) patch.startingPrice = d.startingPrice ?? null;
  if (d.pricingNote !== undefined) patch.pricingNote = d.pricingNote ?? null;
  if (d.hasApi !== undefined) patch.hasApi = d.hasApi ? 1 : 0;
  if (d.githubUrl !== undefined) patch.githubUrl = d.githubUrl ?? null;
  if (d.docsUrl !== undefined) patch.docsUrl = d.docsUrl ?? null;
  if (d.twitterUrl !== undefined) patch.twitterUrl = d.twitterUrl ?? null;
  const rawTags = d.tagsPipe ?? d.tags;
  if (rawTags !== undefined) {
    patch.tagsJson = JSON.stringify(rawTags.split("|").map((t) => t.trim()).filter(Boolean));
  }
  if (d.status !== undefined) patch.status = d.status;
  if (d.pinned !== undefined) patch.pinned = d.pinned;
  if (d.editorsPick !== undefined) patch.editorsPick = d.editorsPick ? 1 : 0;
  if (d.curated !== undefined) patch.curated = d.curated ? 1 : 0;
  if (d.claimed !== undefined) patch.claimed = d.claimed ? 1 : 0;
  if (d.makerHandle !== undefined) patch.makerHandle = d.makerHandle;
  if (d.verifiedAt !== undefined) patch.verifiedAt = d.verifiedAt;
  const targetCatId = d.categoryLegacyId ?? d.categoryId;
  if (targetCatId !== undefined) {
    const cat = await byEitherId(db, categories, targetCatId);
    if (!cat) return null;
    patch.categoryId = cat.id;
  }
  if (args.features !== undefined) patch.featuresJson = JSON.stringify(args.features);
  if (args.logoUrl !== undefined) patch.logoUrl = args.logoUrl ?? null;
  if (args.screenshotUrls !== undefined) {
    patch.screenshotUrlsJson = JSON.stringify(args.screenshotUrls);
  }
  if (args.editorial) {
    const editorial = {
      longDescription: tool.longDescription,
      useCasesJson: tool.useCasesJson,
      prosJson: tool.prosJson,
      consJson: tool.consJson,
      alternativesJson: tool.alternativesJson,
      pricingCheckedAt: tool.pricingCheckedAt,
      contentUpdatedAt: tool.contentUpdatedAt,
    };
    if (applyEditorial(editorial, args.editorial, args.nowMs)) {
      patch.longDescription = editorial.longDescription;
      patch.useCasesJson = editorial.useCasesJson;
      patch.prosJson = editorial.prosJson;
      patch.consJson = editorial.consJson;
      patch.alternativesJson = editorial.alternativesJson;
      patch.pricingCheckedAt = editorial.pricingCheckedAt;
      patch.contentUpdatedAt = editorial.contentUpdatedAt;
    }
  }
  if (Object.keys(patch).length > 0) {
    await db.update(tools).set(patch).where(eq(tools.id, tool.id));
  }
  const [fresh] = await db.select({ slug: tools.slug }).from(tools).where(eq(tools.id, tool.id)).limit(1);
  return { slug: fresh.slug };
}

export async function d1ToolRemove(toolLegacyId: string) {
  const db = await getD1();
  if (!db) return null;
  const tool = await byEitherId<ToolRow>(db, tools, toolLegacyId);
  if (!tool) return null;
  await db.update(tools).set({ status: "removed" }).where(eq(tools.id, tool.id));
  return { slug: tool.slug };
}

export async function d1MarkAllCurated() {
  const db = await getD1();
  if (!db) return null;
  const all = await db.select({ id: tools.id, curated: tools.curated }).from(tools);
  const pending = all.filter((t) => !t.curated);
  for (const t of pending) {
    await db.update(tools).set({ curated: 1 }).where(eq(tools.id, t.id));
  }
  return { updated: pending.length, total: all.length };
}

// ── Categories ───────────────────────────────────────────────────────────

export async function d1CategoryUpsert(args: {
  legacyId: string;
  slug: string;
  name: string;
  emoji: string;
  sortOrder?: number;
  featuresPipe?: string;
}) {
  const db = await getD1();
  if (!db) return null;
  const cat = await byEitherId<typeof categories.$inferSelect>(db, categories, args.legacyId);
  if (cat) {
    const patch: Partial<typeof categories.$inferInsert> = {
      slug: args.slug,
      name: args.name,
      emoji: args.emoji,
    };
    if (args.sortOrder !== undefined) patch.sortOrder = args.sortOrder;
    if (args.featuresPipe !== undefined) {
      patch.featuresJson = JSON.stringify(
        args.featuresPipe.split("|").map((s) => s.trim()).filter(Boolean).slice(0, 12),
      );
    }
    await db.update(categories).set(patch).where(eq(categories.id, cat.id));
    return { id: docId(cat) };
  }
  // Create path (route pre-generates the shared cuid; slug guard per Convex).
  const [dupe] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, args.slug)).limit(1);
  if (dupe) throw new Error("slug_taken");
  await db.insert(categories).values({
    id: crypto.randomUUID(),
    slug: args.slug,
    name: args.name,
    emoji: args.emoji,
    sortOrder: args.sortOrder ?? 0,
    featuresJson: JSON.stringify(
      (args.featuresPipe ?? "").split("|").map((s) => s.trim()).filter(Boolean).slice(0, 12),
    ),
    legacyId: args.legacyId,
  });
  return { id: args.legacyId };
}

export async function d1CategoryDelete(legacyId: string) {
  const db = await getD1();
  if (!db) return null;
  const cat = await byEitherId<typeof categories.$inferSelect>(db, categories, legacyId);
  if (!cat) return null;
  const [attached] = await db
    .select({ n: sql<number>`count(*)` })
    .from(tools)
    .where(eq(tools.categoryId, cat.id));
  if (attached.n > 0) throw new Error(`has_tools:${attached.n}`);
  await db.delete(categories).where(eq(categories.id, cat.id));
  return { slug: cat.slug };
}

// ── Posts ────────────────────────────────────────────────────────────────

export async function d1PostCreate(args: {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  tagsPipe: string;
  coverEmoji: string;
  coverGradient: string;
  author: string;
  status: string;
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string;
  coverUrl?: string | null;
  readingMinutes: number;
  publishedAt?: number;
  createdAt: number;
  updatedAt: number;
}) {
  const db = await getD1();
  if (!db) return null;
  const [dupe] = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, args.slug)).limit(1);
  if (dupe) throw new Error("slug_taken");
  await db.insert(posts).values({
    id: crypto.randomUUID(),
    slug: args.slug,
    title: args.title,
    excerpt: args.excerpt,
    body: args.body,
    coverEmoji: args.coverEmoji,
    coverGradient: args.coverGradient,
    coverUrl: args.coverUrl ?? null,
    category: args.category,
    tagsJson: JSON.stringify(args.tagsPipe.split("|").map((t) => t.trim()).filter(Boolean)),
    status: args.status,
    author: args.author,
    readingMinutes: args.readingMinutes,
    views: 0,
    seoTitle: args.seoTitle ?? null,
    seoDescription: args.seoDescription ?? null,
    keywords: args.keywords ?? null,
    publishedAt: args.publishedAt ?? null,
    legacyId: args.id,
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
  });
  return { id: args.id, slug: args.slug };
}

export async function d1PostPatch(args: {
  postLegacyId: string;
  data: {
    title?: string;
    slug?: string;
    excerpt?: string;
    body?: string;
    category?: string;
    tagsPipe?: string;
    coverEmoji?: string;
    coverGradient?: string;
    author?: string;
    status?: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    keywords?: string | null;
    readingMinutes?: number;
    publishedAt?: number | null;
    updatedAt?: number;
  };
  coverUrl?: string | null;
}) {
  const db = await getD1();
  if (!db) return null;
  const post = await byEitherId<typeof posts.$inferSelect>(db, posts, args.postLegacyId);
  if (!post) return null;
  const patch: Partial<typeof posts.$inferInsert> = {};
  const d = args.data;
  if (d.updatedAt !== undefined) patch.updatedAt = d.updatedAt;
  if (d.title !== undefined) patch.title = d.title;
  if (d.slug !== undefined) patch.slug = d.slug;
  if (d.excerpt !== undefined) patch.excerpt = d.excerpt;
  if (d.body !== undefined) patch.body = d.body;
  if (d.category !== undefined) patch.category = d.category;
  if (d.tagsPipe !== undefined) {
    patch.tagsJson = JSON.stringify(d.tagsPipe.split("|").map((t) => t.trim()).filter(Boolean));
  }
  if (d.coverEmoji !== undefined) patch.coverEmoji = d.coverEmoji;
  if (d.coverGradient !== undefined) patch.coverGradient = d.coverGradient;
  if (d.author !== undefined) patch.author = d.author;
  if (d.status !== undefined) patch.status = d.status;
  if (d.seoTitle !== undefined) patch.seoTitle = d.seoTitle ?? null;
  if (d.seoDescription !== undefined) patch.seoDescription = d.seoDescription ?? null;
  if (d.keywords !== undefined) patch.keywords = d.keywords ?? null;
  if (d.readingMinutes !== undefined) patch.readingMinutes = d.readingMinutes;
  if (d.publishedAt !== undefined) patch.publishedAt = d.publishedAt ?? null;
  if (args.coverUrl !== undefined) patch.coverUrl = args.coverUrl ?? null;
  await db.update(posts).set(patch).where(eq(posts.id, post.id));
  const [fresh] = await db.select({ slug: posts.slug }).from(posts).where(eq(posts.id, post.id)).limit(1);
  return { slug: fresh.slug };
}

export async function d1PostDelete(postLegacyId: string) {
  const db = await getD1();
  if (!db) return null;
  const post = await byEitherId<typeof posts.$inferSelect>(db, posts, postLegacyId);
  if (!post) return null;
  await db.delete(posts).where(eq(posts.id, post.id));
  return { slug: post.slug };
}

// ── Site settings (key-addressed) ────────────────────────────────────────

export async function d1SettingsPut(
  entries: { key: string; value: string }[],
) {
  const db = await getD1();
  if (!db) return null;
  const nowMs = Date.now();
  for (const { key, value } of entries) {
    await db
      .update(siteSettings)
      // Backfilled legacy rows carry created_at = 0; pin it on first touch
      // so the console keeps a truthful creation date (Convex parity).
      .set({ value, updatedAt: nowMs, createdAt: sql`CASE WHEN ${siteSettings.createdAt} = 0 THEN ${nowMs} ELSE ${siteSettings.createdAt} END` })
      .where(eq(siteSettings.key, key));
  }
  const existing = await db.select({ key: siteSettings.key }).from(siteSettings);
  const known = new Set(existing.map((r) => r.key));
  for (const { key, value } of entries) {
    if (!known.has(key)) {
      await db.insert(siteSettings).values({ id: crypto.randomUUID(), key, value, updatedAt: nowMs, createdAt: nowMs });
    }
  }
  return { ok: true as const, updated: entries.length };
}

export async function d1SettingsRemove(keys: string[]) {
  const db = await getD1();
  if (!db) return null;
  let removed = 0;
  for (const key of keys) {
    const deleted = await db
      .delete(siteSettings)
      .where(eq(siteSettings.key, key))
      .returning({ id: siteSettings.id });
    removed += deleted.length;
  }
  return { ok: true as const, removed } as const;
}

// ── Ad campaigns ─────────────────────────────────────────────────────────

export async function d1CampaignCreate(args: {
  id: string;
  name: string;
  advertiser: string;
  placement: string;
  headline: string;
  body: string;
  clickUrl: string;
  emoji: string;
  gradient: string;
  targetCategory?: string | null;
  weight: number;
  startsAt?: number | null;
  endsAt?: number | null;
  totalBudgetCents: number;
  dailyBudgetCents: number;
  status: string;
  createdAt: number;
  updatedAt: number;
}) {
  const db = await getD1();
  if (!db) return null;
  await db.insert(adCampaigns).values({
    id: crypto.randomUUID(),
    name: args.name,
    advertiser: args.advertiser,
    placement: args.placement,
    status: args.status,
    headline: args.headline,
    body: args.body,
    clickUrl: args.clickUrl,
    emoji: args.emoji,
    gradient: args.gradient,
    targetCategory: args.targetCategory ?? null,
    weight: args.weight,
    startsAt: args.startsAt ?? null,
    endsAt: args.endsAt ?? null,
    totalBudgetCents: args.totalBudgetCents,
    dailyBudgetCents: args.dailyBudgetCents,
    impressions: 0,
    clicks: 0,
    viewableImpressions: 0,
    legacyId: args.id,
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
  });
  return { id: args.id };
}

export async function d1CampaignPatch(args: {
  campaignLegacyId: string;
  patch: {
    name?: string;
    advertiser?: string;
    placement?: string;
    status?: string;
    headline?: string;
    body?: string;
    clickUrl?: string;
    emoji?: string;
    gradient?: string;
    targetCategory?: string | null;
    weight?: number;
    startsAt?: string | null;
    endsAt?: string | null;
    totalBudgetCents?: number;
    dailyBudgetCents?: number;
  };
  nowMs: number;
}) {
  const db = await getD1();
  if (!db) return null;
  const campaign = await byEitherId<typeof adCampaigns.$inferSelect>(db, adCampaigns, args.campaignLegacyId);
  if (!campaign) return null;
  const p = args.patch;
  const patch: Partial<typeof adCampaigns.$inferInsert> = { updatedAt: args.nowMs };
  if (p.name !== undefined) patch.name = p.name;
  if (p.advertiser !== undefined) patch.advertiser = p.advertiser;
  if (p.placement !== undefined) patch.placement = p.placement;
  if (p.status !== undefined) patch.status = p.status;
  if (p.headline !== undefined) patch.headline = p.headline;
  if (p.body !== undefined) patch.body = p.body;
  if (p.clickUrl !== undefined) patch.clickUrl = p.clickUrl;
  if (p.emoji !== undefined) patch.emoji = p.emoji;
  if (p.gradient !== undefined) patch.gradient = p.gradient;
  if (p.targetCategory !== undefined) patch.targetCategory = p.targetCategory ?? null;
  if (p.weight !== undefined) patch.weight = p.weight;
  // Route passes ISO datetime strings; stored epoch ms (mirror Convex).
  if (p.startsAt !== undefined) {
    patch.startsAt = p.startsAt ? new Date(p.startsAt).getTime() : null;
  }
  if (p.endsAt !== undefined) {
    patch.endsAt = p.endsAt ? new Date(p.endsAt).getTime() : null;
  }
  if (p.totalBudgetCents !== undefined) patch.totalBudgetCents = p.totalBudgetCents;
  if (p.dailyBudgetCents !== undefined) patch.dailyBudgetCents = p.dailyBudgetCents;
  await db.update(adCampaigns).set(patch).where(eq(adCampaigns.id, campaign.id));
  return { ok: true as const };
}

export async function d1CampaignDelete(campaignLegacyId: string) {
  const db = await getD1();
  if (!db) return null;
  const campaign = await byEitherId<typeof adCampaigns.$inferSelect>(db, adCampaigns, campaignLegacyId);
  if (!campaign) return null;
  await db.delete(adCampaigns).where(eq(adCampaigns.id, campaign.id));
  return { ok: true as const };
}

// ── Integrations (key-addressed) ─────────────────────────────────────────

export async function d1IntegrationUpsert(args: {
  legacyId: string;
  key: string;
  name: string;
  category: string;
  enabled: boolean;
  configJson: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}) {
  const db = await getD1();
  if (!db) return null;
  const key = args.key.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(key)) {
    throw new Error("key must be 2-41 chars");
  }
  const [existing] = await db.select().from(integrations).where(eq(integrations.key, key)).limit(1);
  if (existing) {
    await db
      .update(integrations)
      .set({
        name: args.name,
        category: args.category,
        enabled: args.enabled ? 1 : 0,
        configJson: args.configJson,
        notes: args.notes,
        updatedAt: args.updatedAt,
      })
      .where(eq(integrations.id, existing.id));
    return { key };
  }
  await db.insert(integrations).values({
    id: crypto.randomUUID(),
    key,
    name: args.name,
    category: args.category,
    enabled: args.enabled ? 1 : 0,
    configJson: args.configJson,
    notes: args.notes,
    legacyId: args.legacyId,
    createdAt: args.createdAt,
    updatedAt: args.updatedAt,
  });
  return { key };
}

export async function d1IntegrationDelete(key: string) {
  const db = await getD1();
  if (!db) return null;
  const deleted = await db
    .delete(integrations)
    .where(eq(integrations.key, key))
    .returning({ id: integrations.id });
  if (deleted.length === 0) return null;
  return { ok: true as const };
}

// ── Console table reads (paired with the writes above) ───────────────────

export async function d1AdminCategories() {
  const db = await getD1();
  if (!db) return null;
  const [catRows, counts] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db
      .select({ categoryId: tools.categoryId, n: sql<number>`count(*)` })
      .from(tools)
      .groupBy(tools.categoryId),
  ]);
  const countBy = new Map(counts.map((c) => [c.categoryId, c.n]));
  return {
    categories: catRows.map((c) => ({
      id: docId(c),
      slug: c.slug,
      name: c.name,
      emoji: c.emoji,
      sortOrder: c.sortOrder,
      toolCount: countBy.get(c.id) ?? 0,
      features: JSON.parse(c.featuresJson || "[]").join("|"),
    })),
  };
}

export async function d1AdminPosts(status: string) {
  const db = await getD1();
  if (!db) return null;
  const rows =
    status && status !== "all"
      ? await db.select().from(posts).where(eq(posts.status, status)).orderBy(desc(posts.updatedAt)).limit(500)
      : await db.select().from(posts).orderBy(desc(posts.updatedAt)).limit(500);
  return {
    posts: rows.map((p) => ({
      id: docId(p),
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      tags: JSON.parse(p.tagsJson || "[]").join("|"),
      coverEmoji: p.coverEmoji,
      coverGradient: p.coverGradient,
      status: p.status,
      author: p.author,
      readingMinutes: p.readingMinutes,
      views: p.views,
      seoTitle: p.seoTitle ?? null,
      seoDescription: p.seoDescription ?? null,
      keywords: p.keywords ?? null,
      publishedAt: p.publishedAt != null ? new Date(p.publishedAt).toISOString() : null,
      updatedAt: new Date(p.updatedAt).toISOString(),
      createdAt: new Date(p.createdAt).toISOString(),
      coverUrl: p.coverUrl ?? null,
    })),
  };
}

export async function d1AdminAds() {
  const db = await getD1();
  if (!db) return null;
  // mapCampaign lives with the ads ports; reuse to keep one mapping.
  const { mapCampaign } = await import("./analytics");
  const rows = await db.select().from(adCampaigns);
  const order = { active: 0, paused: 1, draft: 2 };
  const sorted = [...rows].sort(
    (a, b) =>
      (order[a.status as keyof typeof order] ?? 3) -
        (order[b.status as keyof typeof order] ?? 3) ||
      b.createdAt - a.createdAt,
  );
  const campaigns = sorted.slice(0, 200).map(mapCampaign);
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

export async function d1AdminIntegrations() {
  const db = await getD1();
  if (!db) return null;
  const INTEGRATION_CATEGORIES = ["ai", "payment", "cdn", "storage", "email", "analytics", "other"];
  const SECRET_FIELD_RE = /secret|token|api[-_]?key|api[-_]?id|password|private/i;
  const SECRET_SENTINEL = "__MASKED__";
  function parseConfig(raw: string | null): Record<string, string> {
    if (!raw) return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      const out: Record<string, string> = {};
      for (const [k, val] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof val === "string" && k.trim()) out[k.trim()] = val;
      }
      return out;
    } catch {
      return {};
    }
  }
  function maskConfig(config: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [field, value] of Object.entries(config)) {
      out[field] =
        SECRET_FIELD_RE.test(field) && value
          ? value.length > 4
            ? `${SECRET_SENTINEL}:${value.slice(-4)}`
            : SECRET_SENTINEL
          : value;
    }
    return out;
  }
  const rows = await db.select().from(integrations).orderBy(asc(integrations.createdAt));
  return {
    integrations: rows.map((r) => ({
      id: docId(r),
      key: r.key,
      name: r.name,
      category: INTEGRATION_CATEGORIES.includes(r.category) ? r.category : "other",
      enabled: r.enabled === 1,
      config: maskConfig(parseConfig(r.configJson)),
      notes: r.notes,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    })),
    categories: INTEGRATION_CATEGORIES,
  };
}

export async function d1AdminIntegrationRaw(key: string) {
  const db = await getD1();
  if (!db) return null;
  const [row] = await db
    .select({ configJson: integrations.configJson })
    .from(integrations)
    .where(eq(integrations.key, key.trim().toLowerCase()))
    .limit(1);
  return row ? { configJson: row.configJson } : null;
}

export async function d1AdminSettings() {
  const db = await getD1();
  if (!db) return null;
  const rows = await db.select().from(siteSettings).orderBy(asc(siteSettings.key));
  return {
    settings: Object.fromEntries(rows.map((r) => [r.key, r.value])),
    updatedAt: Object.fromEntries(
      rows.map((r) => [r.key, new Date(r.updatedAt ?? r.createdAt).toISOString()]),
    ),
  };
}