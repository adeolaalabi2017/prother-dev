"use client";

import { useEffect, useRef } from "react";
import Clarity from "@microsoft/clarity";

/**
 * ClarityAnalytics mounts Microsoft Clarity tracking on client hydration.
 * Configured via process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID.
 * If the environment variable is unset, it remains idle and safe.
 */
export function ClarityAnalytics() {
  const initialized = useRef(false);

  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();
    if (!projectId || initialized.current) return;

    try {
      Clarity.init(projectId);
      initialized.current = true;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Microsoft Clarity initialization error:", err);
      }
    }
  }, []);

  return null;
}
