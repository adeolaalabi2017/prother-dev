"use client";

import Clarity from "@microsoft/clarity";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

/**
 * Tracks a custom smart event in Microsoft Clarity.
 */
export function trackClarityEvent(eventName: string): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.clarity === "function") {
      window.clarity("event", eventName);
    } else {
      Clarity.event(eventName);
    }
  } catch {
    // Fail silently in non-browser or disabled environments
  }
}

/**
 * Sets custom tags on the active Microsoft Clarity session.
 */
export function setClarityTag(key: string, value: string | string[]): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.clarity === "function") {
      window.clarity("set", key, value);
    } else {
      Clarity.setTag(key, value);
    }
  } catch {
    // Fail silently
  }
}

/**
 * Identifies a user or session with custom identifiers.
 */
export function identifyClarityUser(
  customId: string,
  customSessionId?: string,
  customPageId?: string,
  friendlyName?: string
): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.clarity === "function") {
      window.clarity("identify", customId, customSessionId, customPageId, friendlyName);
    } else {
      Clarity.identify(customId, customSessionId, customPageId, friendlyName);
    }
  } catch {
    // Fail silently
  }
}
