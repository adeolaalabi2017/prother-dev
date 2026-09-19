"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type WaitlistFormProps = {
  source: string;
  dark?: boolean;
  compact?: boolean;
};

export function WaitlistForm({ source, dark = true, compact = false }: WaitlistFormProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ count: number } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = (await res.json()) as {
        count?: number;
        alreadySubscribed?: boolean;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong. Try again.");
      }
      setDone({ count: data.count ?? 0 });
      toast({
        title: data.alreadySubscribed ? "You're already on the list ✓" : "You're on the list ✓",
        description: "See you at 00:00 UTC — one email a day.",
      });
    } catch (err) {
      toast({
        title: "Could not join the waitlist",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-1">
        <p
          className={cn(
            "font-semibold",
            dark ? "text-ember" : "text-[#C24A00]",
            compact ? "text-sm" : "text-base"
          )}
        >
          ✓ You&apos;re on the list — see you at 00:00 UTC.
        </p>
        <p className={cn("font-mono text-xs", dark ? "text-white/40" : "text-black/50")}>
          {done.count.toLocaleString("en-US")} on the list
        </p>
      </div>
    );
  }

  return (
    <div className={cn("w-full", compact ? "space-y-1.5" : "space-y-2")}>
      <form onSubmit={onSubmit} className={cn("flex gap-2", compact ? "flex-row" : "flex-col sm:flex-row")}>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@work.com"
          aria-label="Email address"
          className={cn(
            "h-11 min-w-0 flex-1 font-mono text-sm",
            dark
              ? "border-white/15 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-ember/50 focus-visible:ring-ember/50"
              : "border-black/15 bg-white text-ink placeholder:text-black/30 focus-visible:border-[#C24A00]/40 focus-visible:ring-[#C24A00]/40",
            compact && "h-10 text-xs"
          )}
        />
        <Button
          type="submit"
          disabled={loading}
          className="h-11 shrink-0 whitespace-nowrap rounded-lg bg-ember font-semibold text-black shadow-none hover:bg-ember-hot disabled:opacity-70 dark:text-black"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <>
              Get the daily feed <span aria-hidden>→</span>
            </>
          )}
        </Button>
      </form>
      <p
        className={cn(
          "text-xs",
          dark ? "text-white/40" : "text-black/50",
          compact && "font-mono text-[10px] tracking-wide"
        )}
      >
        Free · One email a day · No spam, unsubscribe anytime
      </p>
    </div>
  );
}
