"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/** Progressive disclosure for listing descriptions (Task 31): long copy
 *  clamps to the first chunk and reveals fully on "Read more". Shared by the
 *  SSR tool page and the client full-page overlay. */
const ABOUT_CLAMP = 260;

export function AboutClamp({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > ABOUT_CLAMP;
  const shown =
    isLong && !expanded
      ? `${text.slice(0, Math.max(0, text.lastIndexOf(" ", ABOUT_CLAMP)))}…`
      : text;
  return (
    <div>
      <p className="text-[15px] leading-relaxed whitespace-pre-line text-white/80 sm:text-base">
        {shown}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md px-1 font-mono text-sm font-semibold tracking-wider text-ember-tint uppercase transition-colors hover:text-ember"
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown
            className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      )}
    </div>
  );
}
