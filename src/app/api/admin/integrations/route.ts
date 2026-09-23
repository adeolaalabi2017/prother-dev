import { NextResponse } from "next/server";
import { guard, logAudit } from "@/lib/admin";
import {
  INTEGRATION_CATEGORIES,
  deleteIntegration,
  listIntegrations,
  upsertIntegration,
  type IntegrationCategory,
} from "@/lib/integrations";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/integrations — masked list for the Settings "API
 * integrations" module. Secret values never leave the server verbatim.
 */
export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;
  try {
    const integrations = await listIntegrations();
    return NextResponse.json({ integrations, categories: INTEGRATION_CATEGORIES });
  } catch (err) {
    console.error("[api/admin/integrations] list failed", err);
    return NextResponse.json(
      { error: "Could not load integrations." },
      { status: 500 }
    );
  }
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
    await upsertIntegration({
      key,
      name: name.slice(0, 60),
      category,
      enabled: body.enabled === true,
      config,
      notes: typeof body.notes === "string" ? body.notes.slice(0, 500) : "",
    });
    logAudit(
      "integration.save",
      "integration",
      key,
      `${name} (${category}${body.enabled === true ? ", enabled" : ""})`
    );
    const integrations = await listIntegrations();
    return NextResponse.json({ integrations, categories: INTEGRATION_CATEGORIES });
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
  try {
    const ok = await deleteIntegration(key);
    if (!ok) {
      return NextResponse.json(
        { error: "Integration not found." },
        { status: 404 }
      );
    }
    logAudit("integration.delete", "integration", key, "");
    const integrations = await listIntegrations();
    return NextResponse.json({ integrations, categories: INTEGRATION_CATEGORIES });
  } catch (err) {
    console.error("[api/admin/integrations] delete failed", err);
    return NextResponse.json(
      { error: "Could not delete the integration." },
      { status: 500 }
    );
  }
}
