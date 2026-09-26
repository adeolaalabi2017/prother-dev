"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Film, ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FAVICON_ACCEPT,
  FAVICON_MAX_BYTES,
  IMAGE_ACCEPT,
  VIDEO_ACCEPT,
  formatBytes,
  uploadMedia,
  type UploadEndpoints,
  type UploadStage,
  type UploadResult,
} from "@/lib/upload-client";

/**
 * Shared upload field for the media library (Task 34; favicon mode Task 35).
 *
 * Drop zone + picker that compresses images client-side (browser-image-
 * compression, 2MB cap) and rejects videos over 5MB BEFORE uploading, then
 * POSTs to /api/admin/upload (endpoint="admin", x-editor-key) or
 * /api/upload (endpoint="user", session auth). The stored value is the
 * stable media URL (/api/media/{id}), themed/origin independent.
 *
 * faviconMode switches the picker to PNG/WebP/ICO for site branding: ICO
 * files are never recompressed (byte-exact passthrough) and everything
 * picked in this mode is pre-checked against the 512KB favicon cap.
 *
 * Styled with brand tokens only, so it tracks both the dark and light
 * themes (Task 33).
 */

export type ImageUploadFieldProps = {
  /** Current media URL (/api/media/{id}) or null. */
  value: string | null;
  onChange: (url: string | null, result: UploadResult | null) => void;
  /** Library purpose tag: tool-logo | tool-screenshot | post-cover | avatar | gallery | branding. */
  purpose: string;
  endpoint: UploadEndpoints;
  /** Required for endpoint="admin". */
  editorKey?: string;
  kind?: "image" | "video";
  label?: string;
  /** Extra helper line, rendered under the format/limit copy. */
  hint?: string;
  /** Branding picker: PNG/WebP/ICO, square, 512KB cap, no recompression. */
  faviconMode?: boolean;
  /** Render preview as a square tile (logos/avatars) instead of a wide thumb. */
  square?: boolean;
  className?: string;
  disabled?: boolean;
};

export function ImageUploadField({
  value,
  onChange,
  purpose,
  endpoint,
  editorKey,
  kind = "image",
  label,
  hint,
  faviconMode = false,
  square = false,
  className,
  disabled = false,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const accept = faviconMode
    ? FAVICON_ACCEPT
    : kind === "video"
      ? VIDEO_ACCEPT
      : IMAGE_ACCEPT;
  const limitHint = faviconMode
    ? "PNG, WebP or ICO. Square, 512KB max."
    : kind === "video"
      ? "MP4, WebM or MOV · 5MB max"
      : "JPEG, PNG, WebP or GIF · compressed to 2MB in your browser";

  const handleFile = useCallback(
    async (file: File) => {
      if (disabled || busy) return;
      setError(null);
      // Favicon pre-check: reject anything over the 512KB cap on select,
      // before any bytes are sent (mirrors the server + prepareMedia cap).
      if (faviconMode && file.size > FAVICON_MAX_BYTES) {
        setError(
          `Favicons are limited to ${formatBytes(FAVICON_MAX_BYTES)}. This one is ${formatBytes(file.size)}. Pick a smaller file.`
        );
        return;
      }
      setBusy(true);
      try {
        const result = await uploadMedia(file, {
          endpoint,
          purpose,
          editorKey,
          onStage: setStage,
        });
        onChange(result.url, result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Upload failed. Try again."
        );
      } finally {
        setBusy(false);
        setStage(null);
      }
    },
    [busy, disabled, editorKey, endpoint, faviconMode, onChange, purpose]
  );

  const onPick = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void handleFile(file);
  };

  const stageLabel =
    stage?.phase === "compressing"
      ? stage.percent < 100
        ? `Compressing… ${stage.percent}%`
        : "Compressed, uploading…"
      : stage?.phase === "uploading"
        ? "Uploading…"
        : null;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <span className="block font-mono text-xs uppercase tracking-[0.2em] text-white/60">
          {label}
        </span>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled || busy}
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = ""; // allow re-picking the same file
        }}
      />

      {value ? (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2",
            // Square tiles (avatars, logos) live in narrow columns: stack
            // compactly, hide the raw URL (title attr keeps it reachable).
            square ? "flex-col" : ""
          )}
        >
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "relative block shrink-0 overflow-hidden rounded-lg border border-white/10 bg-ink",
              square ? "size-20" : "h-16 w-28"
            )}
            title="Open the full-size file"
          >
            {kind === "image" ? (
              <img
                src={value}
                alt="Uploaded media preview"
                className="size-full object-contain"
              />
            ) : (
              <span className="flex size-full items-center justify-center text-white/60">
                <Film className="size-5" aria-hidden />
              </span>
            )}
          </a>
          <div className="min-w-0 flex-1 space-y-1.5">
            {!square && (
              <p className="truncate font-mono text-xs text-white/55">{value}</p>
            )}
            <div className={cn("flex gap-2", square ? "w-full flex-col items-stretch" : "flex-wrap")}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 border-white/15 bg-white/5 text-sm text-white hover:bg-white/10"
                disabled={disabled || busy}
                onClick={() => inputRef.current?.click()}
              >
                <RefreshCw className="size-3.5" aria-hidden />
                Replace
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 border-white/15 bg-white/5 text-sm text-white/70 hover:bg-white/10"
                disabled={disabled || busy}
                onClick={() => onChange(null, null)}
              >
                <X className="size-3.5" aria-hidden />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !busy) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!disabled && !busy) onPick(e.dataTransfer.files);
          }}
          className={cn(
            "flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center transition-colors",
            "border-white/15 bg-white/[0.02] text-white/60",
            !disabled && !busy && "cursor-pointer hover:border-ember/50 hover:bg-ember/[0.04] hover:text-white/80",
            dragOver && "border-ember/60 bg-ember/[0.06] text-white/90",
            (disabled || busy) && "cursor-not-allowed opacity-60",
            square ? "aspect-square" : ""
          )}
          aria-label={label ?? "Upload a file"}
          aria-describedby={hint ? `${inputId}-hint` : undefined}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin text-ember" aria-hidden />
              <span className="text-xs text-white/70">{stageLabel ?? "Working…"}</span>
            </>
          ) : (
            <>
              {kind === "image" ? (
                <ImagePlus className="size-4" aria-hidden />
              ) : (
                <Film className="size-4" aria-hidden />
              )}
              <span className="text-sm font-medium">
                Drop a file here, or click to browse
              </span>
            </>
          )}
        </button>
      )}

      <p id={`${inputId}-hint`} className="text-xs text-white/55">
        {limitHint}
      </p>
      {hint && <p className="text-xs text-white/55">{hint}</p>}

      {error && (
        <p role="alert" className="text-xs font-medium text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

/** Read-only meta line for a finished upload (used by the gallery grid). */
export function uploadMetaLine(result: UploadResult): string {
  return `${result.originalName} · ${formatBytes(result.size)}${result.compressed ? " (compressed)" : ""}`;
}
