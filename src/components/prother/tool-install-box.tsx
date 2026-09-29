"use client";

import { useState } from "react";
import { Check, Copy, Download, Terminal } from "lucide-react";
import { getToolInstallInfo } from "@/lib/tool-install";
import { useToast } from "@/hooks/use-toast";

export function ToolInstallBox({
  slug,
  name,
  websiteUrl,
  githubUrl,
}: {
  slug: string;
  name: string;
  websiteUrl?: string;
  githubUrl?: string | null;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const info = getToolInstallInfo({ slug, name, websiteUrl, githubUrl });

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(info.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Command copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy command", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider text-white/70 uppercase">
          <Terminal className="size-3.5 text-ember" aria-hidden />
          <span>Installation Command</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={info.downloadUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-label={`Download ${name}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-xs font-semibold text-white/80 transition-colors hover:border-ember/40 hover:bg-ember/10 hover:text-ember"
          >
            <Download className="size-3" aria-hidden />
            <span>{info.downloadLabel}</span>
          </a>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-xs font-semibold text-white/80 transition-colors hover:border-ember/40 hover:bg-white/10 hover:text-white"
            aria-label="Copy installation command"
          >
            {copied ? (
              <>
                <Check className="size-3 text-mint" aria-hidden />
                <span className="text-mint">Copied</span>
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
      <div className="flex items-center gap-2 rounded-lg bg-black/60 px-3.5 py-2.5 font-mono text-xs text-white/90 overflow-x-auto">
        <span className="select-none text-white/40">$</span>
        <code className="selection:bg-ember selection:text-black whitespace-nowrap">{info.command}</code>
      </div>
    </div>
  );
}
