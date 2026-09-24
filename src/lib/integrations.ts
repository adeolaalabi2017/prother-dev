import { Prisma } from "@prisma/client";
import { db } from "@/lib/prother";

/**
 * API integrations helpers (Task 34) — external service credentials
 * (AI providers, payment, CDN/storage, email, analytics) managed in the
 * Admin Console under Settings and consumed by server code via
 * getIntegration()/integrationConfig().
 *
 * The Integration table is POST-boot schema: the long-running dev server can
 * hold a cached pre-v8 PrismaClient that does not know it, so EVERY
 * read/write here goes through raw SQL (same rule as lib/media.ts /
 * lib/features.ts — stale-PrismaClient note in lib/forum.ts).
 *
 * Secret handling: values whose field name looks secret-ish are masked in
 * every read that leaves the server (SENTINEL + last 4). A write that sends
 * the sentinel back keeps the stored value, so masked round-trips never
 * destroy credentials.
 */

export const INTEGRATION_CATEGORIES = [
  "ai",
  "payment",
  "cdn",
  "storage",
  "email",
  "analytics",
  "other",
] as const;
export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

/** Sent the admin API instead of a real secret value. */
export const SECRET_SENTINEL = "__MASKED__";

const SECRET_FIELD_RE = /secret|token|api[-_]?key|api[-_]?id|password|private/i;

export function isSecretField(field: string): boolean {
  return SECRET_FIELD_RE.test(field);
}

export type IntegrationRow = {
  id: string;
  key: string;
  name: string;
  category: IntegrationCategory;
  enabled: boolean;
  /** Masked config: secret values replaced with SECRET_SENTINEL. */
  config: Record<string, string>;
  notes: string;
  updatedAt: string;
  createdAt: string;
};

type RawIntegrationRow = {
  id: string;
  key: string;
  name: string;
  category: string;
  enabled: number;
  configJson: string;
  notes: string;
  // Prisma $queryRaw surfaces SQLite DATETIME columns as Date at runtime.
  createdAt: number | string | Date;
  updatedAt: number | string | Date;
};

// Accepts the Date objects Prisma returns for DATETIME columns; anything
// else falls back to the epoch (never throws).
function toIso(v: number | string | Date | null): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isNaN(n) && v.trim() !== "") return new Date(n).toISOString();
    return new Date(v).toISOString();
  }
  return new Date(0).toISOString();
}

/** Never throws: corrupt JSON degrades to an empty config. */
export function parseIntegrationConfig(
  raw: string | null | undefined
): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && k.trim()) out[k.trim()] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** Mask secret values for anything that leaves the server. */
export function maskConfig(config: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, value] of Object.entries(config)) {
    if (isSecretField(field) && value) {
      out[field] =
        value.length > 4
          ? `${SECRET_SENTINEL}:${value.slice(-4)}`
          : SECRET_SENTINEL;
    } else {
      out[field] = value;
    }
  }
  return out;
}

/** True when the client echoed a masked value back (keep stored secret). */
function isMaskedValue(value: string): boolean {
  return value === SECRET_SENTINEL || value.startsWith(`${SECRET_SENTINEL}:`);
}

function mapRaw(r: RawIntegrationRow): IntegrationRow {
  const category = (INTEGRATION_CATEGORIES as readonly string[]).includes(
    r.category
  )
    ? (r.category as IntegrationCategory)
    : "other";
  return {
    id: r.id,
    key: r.key,
    name: r.name,
    category,
    enabled: Number(r.enabled) === 1,
    config: maskConfig(parseIntegrationConfig(r.configJson)),
    notes: r.notes,
    createdAt: toIso(r.createdAt),
    updatedAt: toIso(r.updatedAt),
  };
}

const INTEGRATION_COLS =
  "id, key, name, category, enabled, configJson, notes, createdAt, updatedAt";

/** All integrations, newest first (admin gallery). */
export async function listIntegrations(): Promise<IntegrationRow[]> {
  const rows = await db.$queryRaw<RawIntegrationRow[]>`
    SELECT ${Prisma.raw(INTEGRATION_COLS)} FROM Integration
    ORDER BY createdAt ASC`;
  return rows.map(mapRaw);
}

/** Upsert by key: config is whole-object replace, masked values preserved. */
export async function upsertIntegration(input: {
  key: string;
  name: string;
  category: IntegrationCategory;
  enabled: boolean;
  /** Incoming (possibly masked) config from the admin form. */
  config: Record<string, string>;
  notes?: string;
  /** Dual-write override (Phase 4 step 6) — shared row id. */
  id?: string;
  createdAt?: number;
  updatedAt?: number;
}): Promise<void> {
  const key = input.key.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(key)) {
    throw new Error("Integration key must be 2-41 chars: a-z, 0-9, dashes");
  }
  const existing = await db.$queryRaw<{ configJson: string }[]>`
    SELECT configJson FROM Integration WHERE key = ${key} LIMIT 1`;

  if (existing[0]) {
    const stored = parseIntegrationConfig(existing[0].configJson);
    const merged: Record<string, string> = {};
    for (const [field, value] of Object.entries(input.config)) {
      // Echoed masks keep whatever is stored; real values overwrite.
      merged[field] = isMaskedValue(value) ? (stored[field] ?? "") : value;
    }
    // Fields removed from the form are dropped, EXCEPT stored secrets the
    // masked round-trip omitted (a form without the secret field must not
    // erase the credential).
    for (const [field, value] of Object.entries(stored)) {
      if (!(field in merged) && isSecretField(field) && value) {
        merged[field] = value;
      }
    }
    await db.$executeRaw`
      UPDATE Integration
      SET name = ${input.name}, category = ${input.category},
          enabled = ${input.enabled ? 1 : 0},
          configJson = ${JSON.stringify(merged)},
          notes = ${input.notes ?? ""}, updatedAt = ${Date.now()}
      WHERE key = ${key}`;
    return;
  }

  await db.$executeRaw`
    INSERT INTO Integration
      (id, key, name, category, enabled, configJson, notes, createdAt, updatedAt)
    VALUES
      (${input.id ?? `int_${crypto.randomUUID()}`}, ${key}, ${input.name},
       ${input.category}, ${input.enabled ? 1 : 0},
       ${JSON.stringify(input.config)}, ${input.notes ?? ""},
       ${input.createdAt ?? Date.now()}, ${input.updatedAt ?? Date.now()})`;
}

export async function deleteIntegration(key: string): Promise<boolean> {
  const res = await db.$executeRaw`DELETE FROM Integration WHERE key = ${key}`;
  return res > 0;
}

// ── Server-side consumption ───────────────────────────────────────────────
export type ResolvedIntegration = {
  key: string;
  enabled: boolean;
  /** UNMASKED config — only ever touched inside server code. */
  config: Record<string, string>;
};

/**
 * Fetch one integration for backend use (unmasked). Returns null when the
 * key is unknown; check .enabled before using credentials.
 */
export async function getIntegration(
  key: string
): Promise<ResolvedIntegration | null> {
  const rows = await db.$queryRaw<RawIntegrationRow[]>`
    SELECT ${Prisma.raw(INTEGRATION_COLS)} FROM Integration
    WHERE key = ${key} LIMIT 1`;
  const r = rows[0];
  if (!r) return null;
  return {
    key: r.key,
    enabled: Number(r.enabled) === 1,
    config: parseIntegrationConfig(r.configJson),
  };
}

/** Convenience: enabled integration config or null (skips disabled rows). */
export async function integrationConfig(
  key: string
): Promise<Record<string, string> | null> {
  const resolved = await getIntegration(key);
  return resolved?.enabled ? resolved.config : null;
}
