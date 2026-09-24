import { NextResponse } from "next/server";
import { guard, logAudit } from "@/lib/admin";
import {
  INTEGRATION_CATEGORIES,
  SECRET_SENTINEL,
  isSecretField,
  parseIntegrationConfig,
  type IntegrationCategory,
} from "@/lib/integrations";
import {
  convexIntegrationDelete,
  convexIntegrationUpsert,
  shadowAdminIntegrationRaw,
  shadowAdminIntegrations,
} from "@/lib/data";
import { createServerConvexClient } from "@/lib/convex";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/integrations — masked list for the Settings "API
 * integrations" module. Secret values never leave the server verbatim.
 */
export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;
  // Convex-only read (admin cutover).
  const res = await shadowAdminIntegrations(createServerConvexClient()!);
  return NextResponse.json(res, {
    headers: { "x-data-backend": "convex" },
  });
}

type PutBody = {
  key?: unknown;
  name?: unknown;
  category?: unknown;
  enabled?: unknown;
  config?: unknown;
  notes?: unknown;
};

/**
 * PUT /api/admin/integrations — upsert one integration by key. Config is a
 * whole-object replace; secret values echoed back as the mask sentinel keep
 * their stored value, so masked round-trips never destroy credentials.
 */
export async function PUT(req: Request) {
  const denied = guard(req);
  if (denied) return denied;
  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const key = typeof body.key === "string" ? body.key.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!key || !name) {
    return NextResponse.json(
      { error: "Both a key and a display name are required." },
      { status: 400 }
    );
  }
  const category = (
    INTEGRATION_CATEGORIES as readonly string[]
  ).includes(String(body.category))
    ? (body.category as IntegrationCategory)
    : "other";

  // config: Record<string, string> with length caps.
  const config: Record<string, string> = {};
  if (body.config && typeof body.config === "object" && !Array.isArray(body.config)) {
    for (const [field, value] of Object.entries(
      body.config as Record<string, unknown>
    )) {
      if (typeof value === "string" && field.trim() && field.length <= 60) {
        config[field.trim()] = value.slice(0, 4000);
      }
    }
  }

  try {
    const client = createServerConvexClient()!;
    // Convex-only (admin cutover): sentinel echoes merge against the
    // Convex-stored secrets (mirrors lib/integrations upsertIntegration).
    // Masked round-trips never destroy credentials: echoed masks keep the
    // stored value, and stored secrets absent from the form are preserved.
    const sharedId = `int_${crypto.randomUUID()}`;
    const raw = await shadowAdminIntegrationRaw(client, key);
    const stored = parseIntegrationConfig(raw?.configJson ?? "{}");
    const isMasked = (v: string) =>
      v === SECRET_SENTINEL || v.startsWith(`${SECRET_SENTINEL}:`);
    const merged: Record<string, string> = {};
    for (const [field, value] of Object.entries(config)) {
      merged[field] = isMasked(value) ? (stored[field] ?? "") : value;
    }
    for (const [field, value] of Object.entries(stored)) {
      if (!(field in merged) && isSecretField(field) && value) {
        merged[field] = value;
      }
    }
    const nowMs = Date.now();
    await convexIntegrationUpsert(client, {
      legacyId: sharedId,
      key,
      name: name.slice(0, 60),
      category,
      enabled: body.enabled === true,
      configJson: JSON.stringify(merged),
      notes: typeof body.notes === "string" ? body.notes.slice(0, 500) : "",
      createdAt: nowMs,
      updatedAt: nowMs,
    });
    logAudit(
      "integration.save",
      "integration",
      key,
      `${name} (${category}${body.enabled === true ? ", enabled" : ""})`
    );
    const res = await shadowAdminIntegrations(client);
    return NextResponse.json(res, {
      headers: { "x-data-backend": "convex" },
    });
  } catch (err) {
    const message =
      err instanceof Error && /key must be/.test(err.message)
        ? err.message
        : "Could not save the integration.";
    console.error("[api/admin/integrations] put failed", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** DELETE /api/admin/integrations?key=<slug> — remove a stored integration. */
export async function DELETE(req: Request) {
  const denied = guard(req);
  if (denied) return denied;
  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!key) {
    return NextResponse.json(
      { error: "A key query parameter is required." },
      { status: 400 }
    );
  }
  // Convex-only (admin cutover): the mutation throws not_found.
  try {
    const client = createServerConvexClient()!;
    await convexIntegrationDelete(client, { key });
    logAudit("integration.delete", "integration", key, "");
    const res = await shadowAdminIntegrations(client);
    return NextResponse.json(res, {
      headers: { "x-data-backend": "convex" },
    });
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m.includes("not_found")) {
      return NextResponse.json(
        { error: "Integration not found." },
        { status: 404 }
      );
    }
    console.error("[api/admin/integrations] delete failed", err);
    return NextResponse.json(
      { error: "Could not delete the integration." },
      { status: 500 }
    );
  }
}
