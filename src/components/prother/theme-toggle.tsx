"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/prother/theme-provider";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

/** True only after hydration — SSR-safe "am I mounted?" (no setState-in-effect). */
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/**
 * Theme toggle — dark is the brand default; light is the warm-paper remap
 * (globals.css html.light token flip). Two shapes:
 *   · ThemeToggle      icon button, matches the header utility buttons
 *   · ThemeToggleRow   full-width row, matches the mobile menu rows
 * Both render a stable SSR frame (Sun) and swap the icon after mount;
 * the choice persists in localStorage ("prother-theme").
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isLight = mounted && resolvedTheme === "light";
  const label = isLight ? "Switch to dark theme" : "Switch to light theme";

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      aria-label={label}
      title={label}
      aria-pressed={isLight}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 transition-colors hover:border-ember/40 hover:text-ember",
        className,
      )}
    >
      {isLight ? (
        <Moon className="size-4" aria-hidden />
      ) : (
        <Sun className="size-4" aria-hidden />
      )}
    </button>
  );
}

export function ThemeToggleRow({ onAction }: { onAction?: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isLight = mounted && resolvedTheme === "light";
  const label = isLight ? "Dark mode" : "Light mode";

  return (
    <button
      type="button"
      onClick={() => {
        setTheme(isLight ? "dark" : "light");
        onAction?.();
      }}
      aria-label={`Switch to ${isLight ? "dark" : "light"} theme`}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
    >
      {isLight ? (
        <Moon className="size-4 text-ember" aria-hidden />
      ) : (
        <Sun className="size-4 text-ember" aria-hidden />
      )}
      {label}
    </button>
  );
}
