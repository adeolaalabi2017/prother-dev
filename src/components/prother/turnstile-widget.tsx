"use client";

import { useEffect, useRef, useState } from "react";
import { describeTurnstileError } from "@/lib/turnstile-errors";

/**
 * Cloudflare Turnstile widget (explicit render). Renders nothing unless
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY was set at build time, matching the server,
 * which only enforces the check when TURNSTILE_SECRET_KEY is set.
 */
type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      theme?: "auto" | "light" | "dark";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: (code: string) => boolean | void;
    }
  ) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile script failed to load"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** Count a widget failure by code in the daily error stats (admin Traffic). */
function reportFailure(code: string) {
  try {
    void fetch("/api/analytics/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ m: `turnstile:${code}`, p: window.location.pathname }),
      keepalive: true,
    });
  } catch {
    // analytics never blocks
  }
}

export function TurnstileWidget({
  onToken,
  resetKey = 0,
}: {
  /** Receives the token, or null when it expires or errors. */
  onToken: (token: string | null) => void;
  /** Bump to force a fresh challenge (e.g. after a failed submit). */
  resetKey?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);
  const cb = useRef(onToken);
  const [failure, setFailure] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    cb.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !ref.current) return;
    let alive = true;
    const el = ref.current;
    const fail = (code: string) => {
      cb.current(null);
      if (!alive) return;
      setFailure(code);
      reportFailure(code);
    };
    loadScript()
      .then(() => {
        if (!alive || !window.turnstile) return;
        idRef.current = window.turnstile.render(el, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: (t) => {
            setFailure(null);
            cb.current(t);
          },
          "expired-callback": () => cb.current(null),
          "error-callback": (code) => {
            fail(String(code || "unknown"));
            // Handled: we show our own message and retry button.
            return true;
          },
        });
      })
      .catch(() => fail("script-blocked"));
    return () => {
      alive = false;
      if (idRef.current && window.turnstile) window.turnstile.remove(idRef.current);
      idRef.current = null;
    };
  }, [resetKey, retry]);

  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <div>
      <div ref={ref} className="min-h-[65px]" aria-label="Human verification" />
      {failure && (
        <div role="alert" className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm">
          <p className="text-red-200">
            Verification failed: {describeTurnstileError(failure)}{" "}
            <span className="font-mono text-xs text-red-200/70">(error {failure})</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setFailure(null);
              setRetry((n) => n + 1);
            }}
            className="mt-1.5 text-sm font-semibold text-ember underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
