"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, Triangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FullPageShell, PageError, PageSkeleton } from "./page-shell";
import { useExplorer } from "./explorer-store";

/**
 * Public collection full page (?collection=<slug>) — a curator's set of
 * tools with its own share URL. Private collections 404 for non-owners
 * (server decides via isOwner).
 */

type CollectionTool = {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  votes: number;
  category?: { slug: string; name: string; emoji: string };
  pricing?: { model: string; price: string | null; note: string | null };
  maker?: string;
};

type CollectionDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  ownerName: string;
  isOwner: boolean;
  createdAt: string;
  items: { id: string; position: number; tool: CollectionTool }[];
};

const MONO = "font-mono text-[10px] uppercase tracking-[0.25em] text-white/40";

export function CollectionFullPage() {
  const slug = useExplorer((s) => s.collectionSlug);
  const closeCollection = useExplorer((s) => s.closeCollection);
  const openTool = useExplorer((s) => s.openTool);

  const [detail, setDetail] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadErr, setLoadErr] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    setLoadErr(false);
    try {
      const res = await fetch(`/api/collections/${encodeURIComponent(slug)}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error("failed");
      setDetail(((await res.json()) as { collection: CollectionDetail }).collection);
    } catch {
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    setDetail(null);
    void load();
  }, [load]);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?collection=${encodeURIComponent(slug ?? "")}`
      : `/?collection=${encodeURIComponent(slug ?? "")}`;

  if (!slug) return null;

  if (loading) {
    return (
      <FullPageShell
        kicker="Collection"
        breadcrumb={[{ label: "Home" }]}
        onClose={closeCollection}
        ariaLabel="Collection"
      >
        <PageSkeleton />
      </FullPageShell>
    );
  }

  if (notFound) {
    return (
      <PageError
        title="COLLECTION NOT FOUND"
        message="It may be private, deleted, or the link is wrong."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => closeCollection()}
            className="bg-white/[0.03] hover:bg-white/[0.08] h-10 border-white/15 font-mono text-xs tracking-wider text-white/70 hover:border-ember/40 hover:text-ember"
          >
            ← CLOSE
          </Button>
        }
      />
    );
  }

  if (loadErr || !detail) {
    return (
      <PageError
        title="COULDN'T LOAD THIS COLLECTION"
        message="The collection service didn't respond — try again in a moment."
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void load()}
              className="bg-white/[0.03] hover:bg-white/[0.08] h-10 border-white/15 font-mono text-xs tracking-wider text-white/70 hover:border-ember/40 hover:text-ember"
            >
              RETRY
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => closeCollection()}
              className="bg-white/[0.03] hover:bg-white/[0.08] h-10 border-white/15 font-mono text-xs tracking-wider text-white/70 hover:border-ember/40 hover:text-ember"
            >
              ← CLOSE
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <FullPageShell
      kicker="Curated collection"
      breadcrumb={[{ label: "Home" }, { label: detail.name }]}
      onClose={closeCollection}
      shareUrl={detail.isPublic ? shareUrl : undefined}
      ariaLabel={`Collection: ${detail.name}`}
    >
      <div className="space-y-8">
        {/* Header */}
        <header className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            {detail.name}
          </h1>
          {detail.description && (
            <p className="max-w-2xl text-base leading-relaxed text-white/65">
              {detail.description}
            </p>
          )}
          <p className={MONO}>
            By {detail.ownerName} · {detail.items.length} tool
            {detail.items.length === 1 ? "" : "s"} ·{" "}
            {detail.isPublic ? (
              "Public"
            ) : (
              <span className="inline-flex items-center gap-1">
                <Lock className="size-3" aria-hidden /> Private
              </span>
            )}
          </p>
        </header>

        {/* Items grid */}
        {detail.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">
            Nothing here yet — the curator is still picking.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Collection tools">
            {detail.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openTool(item.tool.slug)}
                  aria-label={`Open ${item.tool.name} details`}
                  className="group h-full w-full rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-colors hover:border-ember/40 hover:bg-ember/[0.04]"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-xl transition-transform group-hover:scale-105",
                        item.tool.gradient
                      )}
                    >
                      {item.tool.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white/90">{item.tool.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-white/45">
                        {item.tool.tagline}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">
                      {item.tool.maker ?? item.tool.category?.name ?? ""}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-ember">
                      <Triangle className="size-3" fill="currentColor" aria-hidden />
                      {item.tool.votes}
                    </span>
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FullPageShell>
  );
}
