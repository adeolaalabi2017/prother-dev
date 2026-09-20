"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Client auth context (F-37). Wraps the page tree so any component can use
 * useSession() — the header sign-in menu, reviews, claims, collections, etc.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>;
}
