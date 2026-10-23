"use client";

import { useCallback, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Check, FolderCheck, FolderPlus, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { requestSignIn } from "@/components/prother/auth-menu";
import { cn } from "@/lib/utils";

export type CollectionRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  itemCount: number;
  covers?: string[];
};

export type SaveCollectionPopoverProps = {
  slug: string;
  toolName: string;
  savedIn?: { slug: string; name: string }[];
  onSavedChange?: (saved: { slug: string; name: string }[]) => void;
  children?: React.ReactNode;
  className?: string;
};

export function SaveCollectionPopover({
  slug,
  toolName,
  savedIn = [],
  onSavedChange,
  children,
  className,
}: SaveCollectionPopoverProps) {
  const { toast } = useToast();
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [colls, setColls] = useState<CollectionRow[] | null>(null);
  const [newName, setNewName] = useState("");
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [localSavedIn, setLocalSavedIn] = useState<{ slug: string; name: string }[]>(savedIn);
  const activeSaved = savedIn.length > 0 ? savedIn : localSavedIn;
  const savedSet = useMemo(() => new Set(activeSaved.map((s) => s.slug)), [activeSaved]);

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (next && status === "unauthenticated") {
        requestSignIn();
        toast({ title: "Sign in to save tools to collections." });
        return;
      }
      setOpen(next);
      if (next) {
        setColls(null);
        fetch("/api/collections")
          .then(async (res) => {
            if (!res.ok) throw new Error("failed");
            return (await res.json()) as { mine: CollectionRow[] };
          })
          .then((data) => setColls(data.mine ?? []))
          .catch(() => setColls([]));
      }
    },
    [status]
  );

  const toggle = useCallback(
    async (c: CollectionRow) => {
      setBusySlug(c.slug);
      try {
        const res = await fetch(`/api/collections/${encodeURIComponent(c.slug)}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolSlug: slug }),
        });
        if (res.status === 401) {
          requestSignIn();
          toast({ title: "Sign in to save tools to collections." });
          return;
        }
        const data = (await res.json().catch(() => ({}))) as { inCollection?: boolean };
        const nowIn = !!data.inCollection;
        const next = nowIn
          ? [...activeSaved, { slug: c.slug, name: c.name }]
          : activeSaved.filter((s) => s.slug !== c.slug);
        setLocalSavedIn(next);
        onSavedChange?.(next);
        toast({
          title: nowIn ? `Saved to ${c.name}` : `Removed from ${c.name}`,
        });
      } catch {
        toast({ title: "Could not update the collection", variant: "destructive" });
      } finally {
        setBusySlug(null);
      }
    },
    [slug, activeSaved, onSavedChange, toast]
  );

  const create = useCallback(async () => {
    const nameTrimmed = newName.trim();
    if (nameTrimmed.length < 2 || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameTrimmed, isPublic: true }),
      });
      if (res.status === 401) {
        requestSignIn();
        toast({ title: "Sign in to save tools to collections." });
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { collection?: CollectionRow };
      if (!res.ok || !data.collection) {
        toast({ title: "Could not create the collection", variant: "destructive" });
        return;
      }
      setColls((prev) => [data.collection!, ...(prev ?? [])]);
      setNewName("");
      const c = data.collection;
      try {
        const itemRes = await fetch(`/api/collections/${encodeURIComponent(c.slug)}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolSlug: slug }),
        });
        if (itemRes.ok) {
          const next = [...activeSaved, { slug: c.slug, name: c.name }];
          setLocalSavedIn(next);
          onSavedChange?.(next);
        }
      } catch {
        // collection exists, item insertion was best-effort
      }
      toast({ title: `Collection "${c.name}" created` });
    } catch {
      toast({ title: "Could not create the collection", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }, [newName, creating, slug, activeSaved, onSavedChange, toast]);

  const defaultTrigger = (
    <button
      type="button"
      aria-label={
        savedSet.size > 0
          ? `Saved in ${savedSet.size} collection${savedSet.size === 1 ? "" : "s"}: manage`
          : `Add ${toolName} to collection`
      }
      aria-pressed={savedSet.size > 0}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full border bg-white/[0.03] transition-colors hover:bg-white/[0.08]",
        "border-white/10 hover:border-ember/40",
        savedSet.size > 0 ? "text-ember" : "text-white/70 hover:text-ember",
        className
      )}
    >
      {savedSet.size > 0 ? (
        <FolderCheck className="size-4 text-ember" aria-hidden />
      ) : (
        <FolderPlus className="size-4" aria-hidden />
      )}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children ?? defaultTrigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-72 border-white/10 bg-coal p-3 text-white"
        aria-label={`Save ${toolName} to a collection`}
      >
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/60">
          Save to collection
        </p>
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {colls === null && (
            <>
              <Skeleton className="h-10 w-full rounded-lg bg-white/5" />
              <Skeleton className="h-10 w-5/6 rounded-lg bg-white/5" />
            </>
          )}
          {colls !== null && colls.length === 0 && (
            <p className="px-1 py-2 text-xs text-white/60">
              No collections yet. Create your first one below.
            </p>
          )}
          {colls?.map((c) => {
            const saved = savedSet.has(c.slug);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => void toggle(c)}
                disabled={busySlug === c.slug}
                aria-pressed={saved}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-white/5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-white/85">{c.name}</span>
                <span className="font-mono text-xs text-white/55">{c.itemCount}</span>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-5 items-center justify-center rounded border",
                    saved ? "border-ember bg-ember/15 text-ember" : "border-white/20 text-transparent"
                  )}
                >
                  <Check className="size-3" />
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2.5">
          <label htmlFor="new-collection-name" className="sr-only">
            New collection name
          </label>
          <Input
            id="new-collection-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value.slice(0, 40))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void create();
              }
            }}
            placeholder="+ New collection"
            className="h-9 border-white/10 bg-transparent text-sm focus-visible:border-ember/50 focus-visible:ring-0"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Create collection"
            onClick={() => void create()}
            disabled={newName.trim().length < 2 || creating}
            className="bg-white/[0.03] hover:bg-white/[0.08] size-9 shrink-0 border-white/10 text-ember hover:border-ember/40 hover:bg-ember/10"
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
