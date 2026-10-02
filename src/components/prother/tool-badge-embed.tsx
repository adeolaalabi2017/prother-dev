"use client";

import { useState } from "react";
import { Award, Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ToolBadgeEmbedProps {
  slug: string;
  name: string;
}

export function ToolBadgeEmbed({ slug, name }: ToolBadgeEmbedProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<"markdown" | "html">("markdown");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const badgeUrl =
    theme === "light"
      ? `https://prother.dev/api/badge/${slug}?theme=light`
      : `https://prother.dev/api/badge/${slug}`;

  const toolUrl = `https://prother.dev/tools/${slug}`;

  const codeSnippet =
    format === "markdown"
      ? `[![Featured on Prother](${badgeUrl})](${toolUrl})`
      : `<a href="${toolUrl}" target="_blank" rel="noopener noreferrer"><img src="${badgeUrl}" alt="${name} on Prother" height="34" /></a>`;

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(codeSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Embed snippet copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy snippet", variant: "destructive" });
    }
  };

  return (
    <section aria-label="Embed badge" className="space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-white/60">
        Embed badge
      </h2>
      <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg border border-ember/30 bg-ember/10 text-ember">
              <Award className="size-4" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white/90">
                Showcase on your README or site
              </h3>
              <p className="text-xs text-white/55">
                Dynamic live SVG badge reflecting verified ratings and picks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme switcher */}
            <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "rounded-md px-2 py-1 transition-colors",
                  theme === "dark"
                    ? "bg-white/15 text-white font-medium"
                    : "text-white/50 hover:text-white/80",
                )}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "rounded-md px-2 py-1 transition-colors",
                  theme === "light"
                    ? "bg-white/15 text-white font-medium"
                    : "text-white/50 hover:text-white/80",
                )}
              >
                Light
              </button>
            </div>

            {/* Format switcher */}
            <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setFormat("markdown")}
                className={cn(
                  "rounded-md px-2 py-1 transition-colors",
                  format === "markdown"
                    ? "bg-white/15 text-white font-medium"
                    : "text-white/50 hover:text-white/80",
                )}
              >
                Markdown
              </button>
              <button
                type="button"
                onClick={() => setFormat("html")}
                className={cn(
                  "rounded-md px-2 py-1 transition-colors",
                  format === "html"
                    ? "bg-white/15 text-white font-medium"
                    : "text-white/50 hover:text-white/80",
                )}
              >
                HTML
              </button>
            </div>
          </div>
        </div>

        {/* Live Badge Preview */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/5 bg-black/40 p-3 sm:px-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-wider text-white/40">
              Preview:
            </span>
            <img
              src={`/api/badge/${slug}${theme === "light" ? "?theme=light" : ""}`}
              alt={`${name} badge`}
              height={34}
              className="h-[34px] w-auto max-w-full"
            />
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="relative">
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/60 p-3 pr-20 font-mono text-xs text-white/80 selection:bg-ember/30">
            <code>{codeSnippet}</code>
          </pre>
          <button
            type="button"
            onClick={copySnippet}
            aria-label="Copy badge snippet"
            className="absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:border-ember/40 hover:bg-ember/20 hover:text-ember"
          >
            {copied ? (
              <>
                <Check className="size-3 text-mint" aria-hidden />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3" aria-hidden />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
