/**
 * API integrations helpers — external service credential shapes
 * (AI providers, payment, CDN/storage, email, analytics) managed in the
 * Admin Console under Settings.
 *
 * Data lives in Convex (convex/adminCrud.ts); the Prisma layer that used
 * to live here was retired with the cutover. What remains are the
 * store-independent pieces: categories, secret masking, and config parsing.
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
