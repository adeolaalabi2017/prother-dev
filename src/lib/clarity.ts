"use client";

import Clarity from "@microsoft/clarity";

/**
 * Tracks a custom smart event in Microsoft Clarity.
 */
export function trackClarityEvent(eventName: string): void {
  if (typeof window === "undefined") return;
  try {
    Clarity.event(eventName);
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
    Clarity.setTag(key, value);
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
    Clarity.identify(customId, customSessionId, customPageId, friendlyName);
  } catch {
    // Fail silently
  }
}
