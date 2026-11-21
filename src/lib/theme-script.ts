/**
 * Pre-hydration theme script, inlined as a PLAIN STRING (never a stringified
 * function): bundler minifiers inject `__name(...)` helpers into function
 * sources, which broke the inlined next-themes script on production with
 * `ReferenceError: __name is not defined`. A string literal passes through
 * minification untouched. Arrow-only, no named functions, no dependencies.
 *
 * Rendered in <head> by the root layout (a server component). Rendering it
 * inside the client ThemeProvider made React 19 log "Encountered a script
 * tag while rendering React component" on every client render. Keep the
 * storage key in sync with STORAGE_KEY in theme-provider.tsx.
 */
export const THEME_INLINE_SCRIPT =
  'try{var t=localStorage.getItem("prother-theme")||"dark",c=document.documentElement;c.classList.remove("light","dark"),c.classList.add(t),c.style.colorScheme=t}catch(e){}';
