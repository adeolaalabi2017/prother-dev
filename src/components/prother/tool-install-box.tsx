"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Cloud,
  Code2,
  Copy,
  Download,
  KeyRound,
  Laptop,
  Terminal,
} from "lucide-react";
import { getToolInstallInfo } from "@/lib/tool-install";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedSdk, setCopiedSdk] = useState(false);
  const info = getToolInstallInfo({ slug, name, websiteUrl, githubUrl });

  const onCopy = async (text: string, isSdk = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isSdk) {
        setCopiedSdk(true);
        setTimeout(() => setCopiedSdk(false), 2000);
      } else {
        setCopiedCmd(true);
        setTimeout(() => setCopiedCmd(false), 2000);
      }
      toast({ title: "Command copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy command", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      {/* ── Case 1: Installable Local Tool / Open Source ── */}
      {info.deliveryType === "installable" && info.command && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-ember/15 text-ember">
                <Terminal className="size-3.5" aria-hidden />
              </span>
              <span className="font-mono text-xs font-semibold tracking-wider text-white/80 uppercase">
                {info.commandTitle ?? "Terminal Installation"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] tracking-wider text-white/50 uppercase">
                Local / CLI
              </span>
            </div>
            <div className="flex items-center gap-2">
              {info.actionUrl && (
                <a
                  href={info.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={`${info.actionLabel} for ${name}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-xs font-semibold text-white/80 transition-colors hover:border-ember/40 hover:bg-ember/10 hover:text-ember"
                >
                  <Download className="size-3" aria-hidden />
                  <span>{info.actionLabel}</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => void onCopy(info.command!)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-xs font-semibold text-white/80 transition-colors hover:border-ember/40 hover:bg-white/10 hover:text-white"
                aria-label="Copy installation command"
              >
                {copiedCmd ? (
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

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/70 px-4 py-3 font-mono text-xs text-white/95 overflow-x-auto shadow-inner">
            <span className="select-none text-ember/70">$</span>
            <code className="selection:bg-ember selection:text-black whitespace-nowrap">
              {info.command}
            </code>
          </div>

          <p className="text-xs text-white/55 leading-relaxed">
            {info.platformNote}
          </p>
        </div>
      )}

      {/* ── Case 2: Downloadable Native Desktop App ── */}
      {info.deliveryType === "desktop_app" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-ember/15 text-ember">
                <Laptop className="size-3.5" aria-hidden />
              </span>
              <span className="font-mono text-xs font-semibold tracking-wider text-white/80 uppercase">
                Desktop Application
              </span>
              <span className="rounded-full border border-mint/30 bg-mint/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-mint uppercase">
                Native App
              </span>
            </div>
            <a
              href={info.actionUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={`Download ${name}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ember px-3 py-1.5 font-mono text-xs font-bold text-[#0A0A0A] transition-colors hover:bg-ember-hot"
            >
              <Download className="size-3.5" aria-hidden />
              <span>{info.actionLabel}</span>
            </a>
          </div>

          <p className="text-xs text-white/60 leading-relaxed">
            {info.platformNote}
          </p>
        </div>
      )}

      {/* ── Case 3: Closed-Weight Cloud API & Developer Console ── */}
      {info.deliveryType === "cloud_api" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-400">
                <KeyRound className="size-3.5" aria-hidden />
              </span>
              <span className="font-mono text-xs font-semibold tracking-wider text-white/80 uppercase">
                Cloud API & Access
              </span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-amber-300 uppercase">
                Closed Weight · Cloud API
              </span>
            </div>
            <a
              href={info.actionUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={`${info.actionLabel} for ${name}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-amber-200 transition-colors hover:border-amber-400 hover:bg-amber-500/20"
            >
              <ArrowUpRight className="size-3.5" aria-hidden />
              <span>{info.actionLabel}</span>
            </a>
          </div>

          <p className="text-xs text-white/60 leading-relaxed">
            {info.platformNote}
          </p>

          {info.hasSdkCommand && info.sdkCommand && (
            <div className="mt-2 space-y-1.5 rounded-xl border border-white/10 bg-black/50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-white/70">
                  <Code2 className="size-3 text-ember" aria-hidden />
                  <span>{info.sdkTitle ?? "SDK Client"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void onCopy(info.sdkCommand!, true)}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-white/60 hover:text-white"
                  aria-label="Copy SDK command"
                >
                  {copiedSdk ? (
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
              <div className="flex items-center gap-2 font-mono text-xs text-white/90">
                <span className="select-none text-white/40">$</span>
                <code>{info.sdkCommand}</code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Case 4: Cloud SaaS / Consumer Web Application ── */}
      {info.deliveryType === "cloud_saas" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-blue-500/15 text-blue-400">
                <Cloud className="size-3.5" aria-hidden />
              </span>
              <span className="font-mono text-xs font-semibold tracking-wider text-white/80 uppercase">
                Cloud Service
              </span>
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-blue-300 uppercase">
                Web Application
              </span>
            </div>
            <a
              href={info.actionUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={`${info.actionLabel} for ${name}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-bold transition-colors",
                info.actionType === "download"
                  ? "bg-ember text-[#0A0A0A] hover:bg-ember-hot"
                  : "border border-white/20 bg-white/5 text-white hover:border-ember/40 hover:bg-white/10 hover:text-ember"
              )}
            >
              {info.actionType === "download" ? (
                <Download className="size-3.5" aria-hidden />
              ) : (
                <ArrowUpRight className="size-3.5" aria-hidden />
              )}
              <span>{info.actionLabel}</span>
            </a>
          </div>

          <p className="text-xs text-white/60 leading-relaxed">
            {info.platformNote}
          </p>
        </div>
      )}
    </div>
  );
}
