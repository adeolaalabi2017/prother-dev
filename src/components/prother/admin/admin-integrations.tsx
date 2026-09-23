"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Age,
  adminFetch,
  inputCx,
  labelCx,
  LoadError,
  Panel,
} from "./admin-shared";

/**
 * Admin — API integrations module (Task 34-c), rendered inside Settings.
 * Stored credentials (AI providers, payment, storage/CDN, email, analytics)
 * backed by GET/PUT/DELETE /api/admin/integrations.
 *
 * Secret handling: the server masks secret-looking fields in every response
 * (sentinel + last 4 chars), and a write that echoes the mask keeps the
 * stored value. This UI therefore never renders a real secret: masked values
 * render as empty password inputs ("Stored: keep or replace"), and a blank
 * secret field is sent back as the mask so saving never destroys a key.
 */

type IntegrationRow = {
  id: string;
  key: string;
  name: string;
  category: string;
  enabled: boolean;
  /** Masked config: secret values arrive as "__MASKED__…" sentinels. */
  config: Record<string, string>;
  notes: string;
  updatedAt: string;
  createdAt: string;
};

// Client-side mirrors of lib/integrations.ts (that module is server-only:
// it imports Prisma, so the browser bundle must not pull it in).
const SECRET_SENTINEL = "__MASKED__";
const SECRET_FIELD_RE = /secret|token|api[-_]?key|api[-_]?id|password|private/i;
const looksSecret = (field: string) => SECRET_FIELD_RE.test(field);
const isMaskedValue = (v: string) =>
  v === SECRET_SENTINEL || v.startsWith(`${SECRET_SENTINEL}:`);

type Template = {
  key: string;
  name: string;
  category: string;
  fields: { name: string; secret?: boolean; placeholder?: string; value?: string }[];
};

/** Built-in prefills for the add form (never injected anywhere automatically). */
const TEMPLATES: Template[] = [
  {
    key: "openai",
    name: "OpenAI",
    category: "ai",
    fields: [
      { name: "apiKey", secret: true, placeholder: "sk-…" },
      { name: "baseUrl", placeholder: "https://api.openai.com/v1", value: "https://api.openai.com/v1" },
      { name: "defaultModel", placeholder: "gpt-4o-mini" },
    ],
  },
  {
    key: "anthropic",
    name: "Anthropic",
    category: "ai",
    fields: [
      { name: "apiKey", secret: true, placeholder: "sk-ant-…" },
      { name: "model", placeholder: "claude-sonnet-4" },
    ],
  },
  {
    key: "stripe",
    name: "Stripe",
    category: "payment",
    fields: [
      { name: "secretKey", secret: true, placeholder: "sk_live_…" },
      { name: "publishableKey", placeholder: "pk_live_…" },
      { name: "webhookSecret", secret: true, placeholder: "whsec_…" },
    ],
  },
  {
    key: "paypal",
    name: "PayPal",
    category: "payment",
    fields: [
      { name: "clientId", placeholder: "live / sandbox client id" },
      { name: "clientSecret", secret: true },
      { name: "mode", placeholder: "sandbox | live" },
    ],
  },
  {
    key: "cloudflare-r2",
    name: "Cloudflare R2",
    category: "storage",
    fields: [
      { name: "accountId", placeholder: "R2 account id" },
      { name: "accessKeyId", secret: true },
      { name: "secretAccessKey", secret: true },
      { name: "bucket", placeholder: "bucket name" },
    ],
  },
  {
    key: "cloudflare-cdn",
    name: "Cloudflare CDN",
    category: "cdn",
    fields: [
      { name: "apiToken", secret: true },
      { name: "zoneId", placeholder: "zone id" },
    ],
  },
  {
    key: "resend",
    name: "Resend",
    category: "email",
    fields: [
      { name: "apiKey", secret: true, placeholder: "re_…" },
      { name: "fromEmail", placeholder: "hello@prother.dev" },
    ],
  },
  {
    key: "plausible",
    name: "Plausible",
    category: "analytics",
    fields: [
      { name: "siteId", placeholder: "prother.dev" },
      { name: "apiBase", placeholder: "https://plausible.io" },
    ],
  },
  { key: "custom", name: "Custom", category: "other", fields: [] },
];

const CATEGORIES: { value: string; label: string }[] = [
  { value: "ai", label: "AI" },
  { value: "payment", label: "Payment" },
  { value: "cdn", label: "CDN" },
  { value: "storage", label: "Storage" },
  { value: "email", label: "Email" },
  { value: "analytics", label: "Analytics" },
  { value: "other", label: "Other" },
];

const KEY_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;

type FormState = {
  key: string;
  name: string;
  category: string;
  enabled: boolean;
  config: Record<string, string>;
  /** Field order: template fields + stored keys + custom rows. */
  fields: string[];
  /** Masked stored values echoed back on save (blank input keeps them). */
  masked: Record<string, string>;
  notes: string;
  /** Templates lock the key; custom rows let the editor pick one. */
  keyLocked: boolean;
};

function formFromTemplate(tpl: Template): FormState {
  return {
    key: tpl.key === "custom" ? "" : tpl.key,
    name: tpl.key === "custom" ? "" : tpl.name,
    category: tpl.category,
    enabled: true,
    config: Object.fromEntries(tpl.fields.map((f) => [f.name, f.value ?? ""])),
    fields: tpl.fields.map((f) => f.name),
    masked: {},
    notes: "",
    keyLocked: tpl.key !== "custom",
  };
}

function formFromRow(row: IntegrationRow): FormState {
  const config: Record<string, string> = {};
  const masked: Record<string, string> = {};
  for (const [field, value] of Object.entries(row.config)) {
    if (isMaskedValue(value)) {
      masked[field] = value;
      config[field] = "";
    } else {
      config[field] = value;
    }
  }
  return {
    key: row.key,
    name: row.name,
    category: row.category,
    enabled: row.enabled,
    config,
    fields: Object.keys(row.config),
    masked,
    notes: row.notes,
    keyLocked: true,
  };
}

function fieldIsSecret(field: string, tpl?: Template): boolean {
  return tpl?.fields.find((f) => f.name === field)?.secret === true || looksSecret(field);
}

function IntegrationForm({
  apiKey,
  state,
  onStateChange,
  onDone,
}: {
  apiKey: string;
  state: FormState;
  onStateChange: (next: FormState) => void;
  onDone: (rows: IntegrationRow[]) => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [newField, setNewField] = useState("");

  const set = (patch: Partial<FormState>) => onStateChange({ ...state, ...patch });
  const setField = (field: string, value: string) =>
    set({ config: { ...state.config, [field]: value } });

  const addField = () => {
    const name = newField.trim().slice(0, 60);
    if (!name || state.fields.includes(name)) return;
    set({
      fields: [...state.fields, name],
      config: { ...state.config, [name]: "" },
    });
    setNewField("");
  };

  const removeField = (field: string) => {
    const config = { ...state.config };
    delete config[field];
    set({
      fields: state.fields.filter((f) => f !== field),
      config,
      masked: Object.fromEntries(
        Object.entries(state.masked).filter(([k]) => k !== field)
      ),
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      // Only send filled fields + echoed masks: an emptied non-secret drops
      // from the config (whole-object replace), a blank secret echoes its
      // mask so the stored value survives the round trip.
      const config: Record<string, string> = {};
      for (const field of state.fields) {
        const v = (state.config[field] ?? "").trim();
        if (v) config[field] = v;
        else if (state.masked[field]) config[field] = state.masked[field];
      }
      const res = await adminFetch(apiKey, "/api/admin/integrations", {
        method: "PUT",
        body: JSON.stringify({
          key: state.key.trim().toLowerCase(),
          name: state.name.trim(),
          category: state.category,
          enabled: state.enabled,
          config,
          notes: state.notes.trim(),
        }),
      });
      const d = (await res.json()) as {
        integrations?: IntegrationRow[];
        error?: string;
      };
      if (!res.ok || !d.integrations) {
        toast({ title: d.error ?? "Save failed", variant: "destructive" });
        return;
      }
      toast({
        title: "Integration saved",
        description: `${state.name.trim()} (${state.category}) stored server-side.`,
      });
      onDone(d.integrations);
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const valid =
    KEY_RE.test(state.key.trim().toLowerCase()) && state.name.trim().length >= 2;

  return (
    <div className="space-y-3 rounded-xl border border-ember/25 bg-ember/[0.04] p-3.5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className={labelCx}>Key</Label>
          <Input
            value={state.key}
            readOnly={state.keyLocked}
            onChange={(e) =>
              set({ key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })
            }
            placeholder="openai"
            aria-label="Integration key"
            className={cn(inputCx, "font-mono", state.keyLocked && "opacity-70")}
          />
          <p className="text-xs text-white/55">
            {state.keyLocked
              ? "Fixed by the template. Server code reads config via this key."
              : "2 to 41 chars: a-z, 0-9, dashes. Server code reads config via this key."}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className={labelCx}>Display name</Label>
          <Input
            value={state.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="OpenAI"
            aria-label="Integration display name"
            className={inputCx}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={labelCx}>Category</Label>
          <Select
            value={state.category}
            onValueChange={(v) => set({ category: v })}
          >
            <SelectTrigger aria-label="Integration category" className={inputCx}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-coal text-white">
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className={labelCx}>Status</Label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-white/70">
            <Switch
              checked={state.enabled}
              onCheckedChange={(v) => set({ enabled: v })}
              className="data-[state=checked]:bg-ember"
              aria-label="Integration enabled"
            />
            {state.enabled ? "Enabled" : "Disabled"}
          </label>
        </div>
      </div>

      <div className="space-y-2.5">
        <p className={labelCx}>Configured fields</p>
        {state.fields.map((field) => {
          const secret = fieldIsSecret(field);
          const wasMasked = Boolean(state.masked[field]);
          return (
            <div key={field} className="flex items-end gap-2">
              <div className="w-40 shrink-0 pb-2.5">
                <span
                  className="block truncate font-mono text-xs text-white/70"
                  title={field}
                >
                  {field}
                </span>
                {secret && (
                  <span className="font-mono text-xs tracking-wider text-ember uppercase">
                    secret
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Input
                  type={secret ? "password" : "text"}
                  value={state.config[field] ?? ""}
                  onChange={(e) => setField(field, e.target.value)}
                  placeholder={
                    wasMasked
                      ? "Stored: keep or replace"
                      : secret
                        ? "Value is stored server-side"
                        : field
                  }
                  autoComplete="off"
                  aria-label={`Value for ${field}`}
                  className={cn(inputCx, secret && "font-mono")}
                />
              </div>
              <button
                type="button"
                aria-label={`Remove field ${field}`}
                onClick={() => removeField(field)}
                className="mb-0.5 rounded-lg p-2.5 text-white/60 transition-colors hover:text-red-400"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          );
        })}
        {state.fields.length === 0 && (
          <p className="text-xs text-white/55">
            No fields yet. Add the keys this integration needs below.
          </p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Input
            value={newField}
            onChange={(e) => setNewField(e.target.value)}
            placeholder="Custom field name"
            aria-label="Custom field name"
            maxLength={60}
            className={cn(inputCx, "w-44")}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={addField}
            disabled={!newField.trim()}
            className="rounded-lg border-white/15 text-white/70 hover:bg-white/5"
          >
            <Plus className="size-3.5" aria-hidden />
            Add field
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={labelCx}>Notes</Label>
        <Textarea
          value={state.notes}
          rows={2}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Where this integration is used, rotation dates…"
          aria-label="Integration notes"
          className={inputCx}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
        <Button
          disabled={busy || !valid}
          onClick={() => void save()}
          className="rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          Save integration
        </Button>
        <p className="text-xs text-white/55">
          Secrets never leave the server verbatim: they are returned masked
          (last 4 characters only). Leave a secret blank to keep the stored
          value.
        </p>
      </div>
    </div>
  );
}

export function IntegrationsModule({ apiKey }: { apiKey: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<IntegrationRow[] | null>(null);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [tplKey, setTplKey] = useState("");
  const [draft, setDraft] = useState<FormState | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editState, setEditState] = useState<FormState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(() => {
    adminFetch(apiKey, "/api/admin/integrations")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ integrations: IntegrationRow[] }>;
      })
      .then((d) => {
        setRows(d.integrations);
        setError(false);
      })
      .catch(() => setError(true));
  }, [apiKey]);

  useEffect(load, [load]);

  const retry = useCallback(() => {
    setRows(null);
    setError(false);
    load();
  }, [load]);

  const pickTemplate = (key: string) => {
    setTplKey(key);
    const tpl = TEMPLATES.find((t) => t.key === key);
    setDraft(tpl ? formFromTemplate(tpl) : null);
  };

  const toggleEnabled = useCallback(
    async (row: IntegrationRow) => {
      setBusyKey(row.key);
      try {
        // Masked config echoes back: the server keeps stored secrets.
        const res = await adminFetch(apiKey, "/api/admin/integrations", {
          method: "PUT",
          body: JSON.stringify({
            key: row.key,
            name: row.name,
            category: row.category,
            enabled: !row.enabled,
            config: row.config,
            notes: row.notes,
          }),
        });
        const d = (await res.json()) as {
          integrations?: IntegrationRow[];
          error?: string;
        };
        if (!res.ok || !d.integrations) {
          toast({ title: d.error ?? "Update failed", variant: "destructive" });
          return;
        }
        setRows(d.integrations);
        toast({
          title: `${row.name} ${!row.enabled ? "enabled" : "disabled"}`,
          description: !row.enabled
            ? "Server code can read its credentials again."
            : "Disabled integrations are ignored server-side.",
        });
      } catch {
        toast({ title: "Network error", variant: "destructive" });
      } finally {
        setBusyKey(null);
      }
    },
    [apiKey, toast]
  );

  const deleteRow = useCallback(
    async (row: IntegrationRow) => {
      setBusyKey(row.key);
      try {
        const res = await adminFetch(
          apiKey,
          `/api/admin/integrations?key=${encodeURIComponent(row.key)}`,
          { method: "DELETE" }
        );
        const d = (await res.json()) as {
          integrations?: IntegrationRow[];
          error?: string;
        };
        if (!res.ok || !d.integrations) {
          toast({ title: d.error ?? "Delete failed", variant: "destructive" });
          return;
        }
        setRows(d.integrations);
        setConfirmDelete(null);
        if (editingKey === row.key) {
          setEditingKey(null);
          setEditState(null);
        }
        toast({ title: "Integration deleted", description: row.name });
      } catch {
        toast({ title: "Network error", variant: "destructive" });
      } finally {
        setBusyKey(null);
      }
    },
    [apiKey, editingKey, toast]
  );

  const configuredCount = (row: IntegrationRow) =>
    Object.values(row.config).filter((v) => v !== "").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-mono text-xs tracking-[0.2em] text-ember uppercase">
            <KeyRound className="size-3.5" aria-hidden />
            API integrations
          </p>
          <p className="mt-0.5 text-sm text-white/60">
            External service credentials: AI, payment, storage, CDN, email,
            analytics. Stored server-side, masked in every response.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setAdding((v) => !v);
            setEditingKey(null);
            setEditState(null);
          }}
          aria-expanded={adding}
          className="ml-auto rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal"
        >
          <Plus className="size-4" aria-hidden />
          Add integration
        </Button>
      </div>

      {adding && (
        <Panel>
          <div className="space-y-3">
            <div className="max-w-xs space-y-1.5">
              <Label className={labelCx}>Start from a template</Label>
              <Select value={tplKey} onValueChange={pickTemplate}>
                <SelectTrigger aria-label="Integration template" className={inputCx}>
                  <SelectValue placeholder="Pick a template" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-coal text-white">
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-white/55">
                Templates only prefill the form below. Nothing is stored until
                you save.
              </p>
            </div>
            {draft && (
              <IntegrationForm
                apiKey={apiKey}
                state={draft}
                onStateChange={setDraft}
                onDone={(fresh) => {
                  setRows(fresh);
                  setAdding(false);
                  setDraft(null);
                  setTplKey("");
                }}
              />
            )}
          </div>
        </Panel>
      )}

      {error ? (
        <LoadError label="Integrations" onRetry={retry} />
      ) : rows === null ? (
        <p className="py-6 text-center text-sm text-white/55">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
          <p className="font-mono text-sm text-white/60">
            No integrations saved yet.
          </p>
          <p className="mt-1 text-xs text-white/55">
            Add one from a template above.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const tpl = TEMPLATES.find((t) => t.key === row.key);
            return (
              <Panel key={row.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 font-mono text-xs text-ember">
                    {row.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {row.name}
                      <span className="ml-2 font-mono text-xs font-normal text-white/55">
                        {row.key}
                      </span>
                    </p>
                    <p className="font-mono text-xs text-white/55">
                      {configuredCount(row)} field
                      {configuredCount(row) === 1 ? "" : "s"} configured ·
                      updated <Age iso={row.updatedAt} />
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs tracking-wider text-white/60 uppercase">
                    {row.category}
                  </span>
                  <Switch
                    checked={row.enabled}
                    disabled={busyKey === row.key}
                    onCheckedChange={() => void toggleEnabled(row)}
                    className="data-[state=checked]:bg-ember"
                    aria-label={`${row.enabled ? "Disable" : "Enable"} ${row.name}`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingKey(editingKey === row.key ? null : row.key);
                      setEditState(
                        editingKey === row.key ? null : formFromRow(row)
                      );
                      setAdding(false);
                      setDraft(null);
                      setConfirmDelete(null);
                    }}
                    aria-expanded={editingKey === row.key}
                    className="h-8 rounded-lg border-white/15 text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    Edit
                  </Button>
                  {confirmDelete === row.key ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <Button
                        size="sm"
                        disabled={busyKey === row.key}
                        onClick={() => void deleteRow(row)}
                        className="h-8 rounded-lg bg-red-500 text-white shadow-none hover:bg-red-400"
                      >
                        {busyKey === row.key ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="size-3.5" aria-hidden />
                        )}
                        Confirm delete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDelete(null)}
                        className="h-8 rounded-lg text-white/60 hover:text-white"
                      >
                        Keep
                      </Button>
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDelete(row.key)}
                      aria-label={`Delete ${row.name}`}
                      className="h-8 rounded-lg text-red-400 hover:bg-red-400/10 hover:text-red-300"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  )}
                </div>

                {row.notes && (
                  <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-white/55">
                    {row.notes}
                  </p>
                )}

                {editingKey === row.key && editState && (
                  <div className="mt-3">
                    <IntegrationForm
                      apiKey={apiKey}
                      state={editState}
                      onStateChange={setEditState}
                      onDone={(fresh) => {
                        setRows(fresh);
                        setEditingKey(null);
                        setEditState(null);
                      }}
                    />
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      <p className="font-mono text-xs leading-relaxed text-white/55">
        SECRET FIELDS (KEYS, TOKENS, PASSWORDS) ARE MASKED IN EVERY RESPONSE:
        ONLY THE LAST 4 CHARACTERS ARE SHOWN. SAVE WITH A BLANK SECRET TO KEEP
        THE STORED VALUE. DISABLED INTEGRATIONS ARE IGNORED SERVER-SIDE.
      </p>
    </div>
  );
}
