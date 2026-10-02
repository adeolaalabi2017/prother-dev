"use client";

import { useCallback, useState } from "react";
import { Loader2, RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch } from "./admin-shared";

type PurgeResult = {
  executed: boolean;
  keptEmail: string;
  purgedHandles: string[];
  counts: Record<string, number>;
};

const TABLE_LABELS: [string, string][] = [
  ["users", "Accounts"],
  ["authAccounts", "OAuth links"],
  ["authSessions", "Sessions"],
  ["authVerificationTokens", "Login tokens"],
  ["reviews", "Reviews"],
  ["comments", "Comments"],
  ["forumThreads", "Threads"],
  ["forumReplies", "Replies"],
  ["forumThreadVotes", "Thread votes"],
  ["collections", "Collections"],
  ["collectionItems", "Collection items"],
  ["follows", "Follows"],
  ["bookmarks", "Saved items"],
  ["submissions", "Submissions"],
  ["claims", "Claims"],
  ["reports", "Reports"],
  ["media", "Uploads"],
  ["adCampaigns", "Ad campaigns"],
  ["toolsRecomputed", "Counters fixed"],
];

/**
 * Danger Zone — one-time launch purge. Dry-run preview first (read-only
 * counts + the doomed handle list), then type PURGE to execute.
 * Tools, categories, journal, settings, analytics and the audit trail
 * are never touched.
 */
export function PurgeTab({
  apiKey,
  onChanged,
}: {
  apiKey: string;
  onChanged: () => void;
}) {
  const [preview, setPreview] = useState<PurgeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PurgeResult | null>(null);

  const run = useCallback(
    async (execute: boolean) => {
      if (execute) setExecuting(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await adminFetch(apiKey, "/api/admin/purge", {
          method: "POST",
          body: JSON.stringify({
            confirm: execute ? confirm : "",
            execute,
          }),
        });
        const data = (await res.json().catch(() => null)) as
          | (PurgeResult & { error?: string })
          | null;
        if (!res.ok || !data || "error" in data) {
          throw new Error(
            (data as { error?: string } | null)?.error ??
              "Purge request failed."
          );
        }
        if (execute) {
          setDone(data);
          setPreview(null);
          setConfirm("");
          onChanged();
        } else {
          setPreview(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Purge request failed.");
      } finally {
        setLoading(false);
        setExecuting(false);
      }
    },
    [apiKey, confirm, onChanged]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-500/40 bg-red-500/[0.06] p-4">
        <p className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
          <TriangleAlert className="size-4" aria-hidden />
          Irreversible
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
          Deletes every account except the owner&apos;s, plus all
          user-attributable content and demo campaigns. Tools, categories,
          journal, settings, analytics and the audit trail survive. There is
          no undo: preview first.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}

      {done ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">
            Purge executed
          </p>
          <p className="mt-2 text-sm text-white/75">
            {done.purgedHandles.length} account(s) removed.{" "}
            {done.keptEmail} untouched.
          </p>
        </div>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => void run(false)}
            disabled={loading}
            className="border-white/15 text-white/80 hover:border-ember/40 hover:text-white"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Scanning…
              </>
            ) : (
              <>
                <RotateCcw className="size-4" aria-hidden />
                Preview purge
              </>
            )}
          </Button>

          {preview && (
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-sm text-white/80">
                <span className="font-semibold text-white">
                  {preview.purgedHandles.length} account(s)
                </span>{" "}
                would be deleted
                {preview.purgedHandles.length > 0 && (
                  <>
                    {" "}
                    (
                    {preview.purgedHandles.slice(0, 12).join(", ")}
                    {preview.purgedHandles.length > 12 &&
                      ` +${preview.purgedHandles.length - 12} more`}
                    )
                  </>
                )}
                . Keeper:{" "}
                <span className="font-mono text-mint">{preview.keptEmail}</span>
                .
              </p>
              <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {TABLE_LABELS.map(([k, label]) => (
                  <li
                    key={k}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.07] px-3 py-1.5 font-mono text-xs"
                  >
                    <span className="tracking-wider text-white/60 uppercase">
                      {label}
                    </span>
                    <span className="font-bold tabular-nums text-white">
                      {preview.counts[k] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2.5 border-t border-white/10 pt-4">
                <Input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder='Type PURGE to confirm'
                  autoComplete="off"
                  spellCheck={false}
                  className="h-10 w-44 rounded-lg border-red-500/40 bg-transparent font-mono text-sm tracking-widest text-white placeholder:text-white/40 focus-visible:border-red-400/60 focus-visible:ring-0"
                />
                <Button
                  type="button"
                  onClick={() => void run(true)}
                  disabled={executing || confirm !== "PURGE"}
                  className="h-10 rounded-lg bg-red-600 px-5 font-mono text-sm font-black tracking-wider text-white shadow-none hover:bg-red-500 disabled:opacity-40"
                >
                  {executing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      PURGING…
                    </>
                  ) : (
                    "EXECUTE PURGE"
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
