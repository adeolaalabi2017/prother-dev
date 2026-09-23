"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useExplorer } from "./explorer-store";

/**
 * CTA that opens the §11 submission wizard overlay (mounted in the layout,
 * so it works from any route). Used on /submit and anywhere else the
 * wizard should open in place.
 */
export function SubmitOpenButton({
  label = "Submit your tool",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const setSubmitOpen = useExplorer((s) => s.setSubmitOpen);
  return (
    <Button
      type="button"
      onClick={() => setSubmitOpen(true)}
      className={cn(
        "rounded-lg bg-ember font-semibold text-coal shadow-none hover:bg-ember-hot dark:text-coal",
        className
      )}
    >
      {label}
      <ArrowRight className="size-4" aria-hidden />
    </Button>
  );
}
