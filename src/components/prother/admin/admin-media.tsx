"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  ExternalLink,
  Film,
  Images,
  Search,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/media-limits";
import { ImageUploadField } from "@/components/prother/image-upload-field";
import type { UploadResult } from "@/lib/upload-client";
import {
  Age,
  adminFetch,
  inputCx,
  labelCx,
  LoadError,
  Panel,
} from "./admin-shared";

/**
 * Admin — Media module (Task 34-c).
 * Gallery over GET /api/media: storage total, image/video + name filters,
 * an upload zone (shared ImageUploadField, endpoint="admin") and per-file
 * copy/open/delete actions. DELETE /api/media/[id] also clears any tool,
 * post or avatar references server-side, so removal is always safe.
 */

type MediaItem = {
  id: string;
  kind: string;
  mimeType: string;
  size: number;
  originalName: string;
  storedName: string;
  width: number | null;
  height: number | null;
  purpose: string;
  ownerKey: string;
  createdAt: string;
};

type KindFilter = "all" | "image" | "video";

const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
];

function mediaUrl(id: string): string {
  return `/api/media/${id}`;
}

function MediaSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-xl bg-white/[0.04]" />
      ))}
    </div>
  );
}

export function AdminMediaTab({
  apiKey,
  onChanged,
}: {
  apiKey: string;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [totalBytes, setTotalBytes] = useState(0);
  const [error, setError] = useState(false);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [q, setQ] = useState("");
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    adminFetch(apiKey, "/api/media?take=500")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ media: MediaItem[]; totalBytes: number }>;
      })
      .then((d) => {
        setItems(d.media);
        setTotalBytes(d.totalBytes ?? 0);
        setError(false);
      })
      .catch(() => setError(true));
  }, [apiKey]);

  useEffect(load, [load]);

  const retry = useCallback(() => {
    setItems(null);
    setError(false);
    load();
  }, [load]);

  /** Gallery upload zones stay empty: the new file shows up in the grid. */
  const onUploaded = useCallback(
    (url: string | null, result: UploadResult | null) => {
      if (!url || !result) return;
      toast({
        title: "Upload complete",
        description: `${result.originalName} (${formatBytes(result.size)}) added to the library.`,
      });
      load();
      onChanged();
    },
    [toast, load, onChanged]
  );

  const copyUrl = useCallback(
    async (m: MediaItem) => {
      try {
        const absolute = `${window.location.origin}${mediaUrl(m.id)}`;
        await navigator.clipboard.writeText(absolute);
        toast({ title: "Media URL copied", description: m.originalName });
      } catch {
        toast({
          title: "Copy failed",
          description: `Copy it manually: ${mediaUrl(m.id)}`,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const deleteItem = useCallback(
    async (m: MediaItem) => {
      setDeleting(true);
      try {
        const res = await adminFetch(apiKey, `/api/media/${m.id}`, {
          method: "DELETE",
        });
        const d = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !d.ok) {
          toast({ title: d.error ?? "Delete failed", variant: "destructive" });
          return;
        }
        toast({
          title: "Media deleted",
          description: `${m.originalName} removed. Listing, post and avatar references cleared.`,
        });
        setPendingDelete(null);
        load();
        onChanged();
      } catch {
        toast({ title: "Network error", variant: "destructive" });
      } finally {
        setDeleting(false);
      }
    },
    [apiKey, load, onChanged, toast]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (items ?? []).filter((m) => {
      if (kindFilter !== "all" && m.kind !== kindFilter) return false;
      if (needle && !m.originalName.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, kindFilter, q]);

  return (
    <div className="space-y-4">
      {/* header row: title, storage, filters */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-mono text-xs tracking-[0.2em] text-ember uppercase">
            <Images className="size-3.5" aria-hidden />
            Media library
          </p>
          <p className="mt-0.5 text-sm text-white/60">
            {items === null ? "…" : `${filtered.length} of ${items.length} files`}{" "}
            · {formatBytes(totalBytes)} stored
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/55"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search file name…"
              aria-label="Search media by file name"
              className={cn(inputCx, "w-44 pl-8 sm:w-52")}
            />
          </div>
          <Select
            value={kindFilter}
            onValueChange={(v) => setKindFilter(v as KindFilter)}
          >
            <SelectTrigger aria-label="Filter by kind" className={cn(inputCx, "w-32")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-coal text-white">
              {KIND_FILTERS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* upload zone */}
      <Panel>
        <p className={labelCx}>Upload files</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <ImageUploadField
            value={null}
            onChange={onUploaded}
            purpose="gallery"
            endpoint="admin"
            editorKey={apiKey}
            label="Images"
            hint="JPEG, PNG, WebP or GIF · compressed to 2MB in your browser"
          />
          <ImageUploadField
            value={null}
            onChange={onUploaded}
            purpose="gallery"
            endpoint="admin"
            editorKey={apiKey}
            kind="video"
            label="Videos"
            hint="MP4, WebM or MOV · 5MB max"
          />
        </div>
      </Panel>

      {/* grid */}
      {error ? (
        <LoadError label="Media" onRetry={retry} />
      ) : items === null ? (
        <MediaSkeleton />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
          <Images className="mx-auto size-8 text-white/40" aria-hidden />
          <p className="mt-3 font-mono text-sm text-white/60">No media yet.</p>
          <p className="mt-1 text-xs text-white/55">
            Upload images or videos above to build the library.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/55">
          No media matches the current filters.
        </p>
      ) : (
        <div className="max-h-[56vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
              >
                <a
                  href={mediaUrl(m.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open the full-size file"
                  className="block aspect-square bg-ink"
                >
                  {m.kind === "image" ? (
                    <img
                      src={mediaUrl(m.id)}
                      alt={m.originalName}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-white/60">
                      <Film className="size-6" aria-hidden />
                    </span>
                  )}
                </a>
                <div className="space-y-1.5 p-2.5">
                  <p
                    className="truncate text-xs font-medium text-white"
                    title={m.originalName}
                  >
                    {m.originalName}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-white/55">
                    <span>{formatBytes(m.size)}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-px tracking-wider uppercase">
                      {m.purpose}
                    </span>
                    <Age iso={m.createdAt} />
                  </div>
                  <div className="flex items-center gap-1 pt-0.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void copyUrl(m)}
                      aria-label={`Copy URL for ${m.originalName}`}
                      className="h-8 flex-1 rounded-lg border-white/15 px-2 text-xs text-white/70 hover:bg-white/5 hover:text-white"
                    >
                      <Copy className="size-3.5" aria-hidden />
                      Copy URL
                    </Button>
                    <a
                      href={mediaUrl(m.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${m.originalName} in a new tab`}
                      className="flex h-8 items-center rounded-lg border border-white/15 px-2 text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPendingDelete(m)}
                      aria-label={`Delete ${m.originalName}`}
                      className="h-8 rounded-lg px-2 text-red-400 hover:bg-red-400/10 hover:text-red-300"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="font-mono text-xs leading-relaxed text-white/55">
        DELETE ALSO CLEARS REFERENCES: TOOL LOGOS, SCREENSHOT LISTS, POST COVERS
        AND USER AVATARS POINTING AT THE FILE ARE CLEANED SERVER-SIDE.
      </p>

      {/* delete confirm */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent className="border-white/10 bg-coal text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {pendingDelete?.originalName} ({formatBytes(pendingDelete?.size ?? 0)})
              will be removed from storage. Any listing logo, screenshot, post
              cover or avatar referencing it is cleared automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="border-white/15 bg-transparent text-white/70 hover:bg-white/5 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault(); // keep the dialog mounted while deleting
                if (pendingDelete) void deleteItem(pendingDelete);
              }}
              className="bg-red-500 text-white hover:bg-red-400"
            >
              {deleting ? "Deleting…" : "Delete file"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
