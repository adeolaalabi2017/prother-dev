"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "prother-theme";
const DEFAULT_THEME: Theme = "dark";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "light"
      ? "light"
      : "dark";
  } catch {
    return DEFAULT_THEME;
  }
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

/**
 * Pre-hydration theme script, inlined as a PLAIN STRING (never a stringified
 * function): bundler minifiers inject `__name(...)` helpers into function
 * sources, which broke the inlined next-themes script on production with
 * `ReferenceError: __name is not defined`. A string literal passes through
 * minification untouched. Arrow-only, no named functions, no dependencies.
 */
const THEME_INLINE_SCRIPT =
  'try{var t=localStorage.getItem("prother-theme")||"dark",c=document.documentElement;c.classList.remove("light","dark"),c.classList.add(t),c.style.colorScheme=t}catch(e){}';

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  resolvedTheme: DEFAULT_THEME,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode etc. — in-memory theme still applies this session.
    }
    // Suppress the theme-transition flash (mirrors the old
    // disableTransitionOnChange behavior).
    const style = document.createElement("style");
    style.appendChild(
      document.createTextNode(
        "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}",
      ),
    );
    document.head.appendChild(style);
    applyTheme(next);
    window.getComputedStyle(document.body);
    window.setTimeout(() => {
      document.head.removeChild(style);
    }, 1);
  }, []);

  // Cross-tab sync + late class application after mount.
  useEffect(() => {
    applyTheme(theme);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setThemeState(e.newValue === "light" ? "light" : "dark");
        applyTheme(e.newValue === "light" ? "light" : "dark");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [theme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme: theme, setTheme }),
    [theme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <script
        dangerouslySetInnerHTML={{ __html: THEME_INLINE_SCRIPT }}
        suppressHydrationWarning
      />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
