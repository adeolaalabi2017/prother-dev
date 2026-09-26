"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link2, CalendarDays, Clock3, Feather } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { useExplorer } from "./explorer-store";

/**
 * Journal article reader — full-height dialog rendering the post's markdown
 * with .post-body typography. SEO surface: updates document.title + meta
 * description, injects BlogPosting JSON-LD, syncs ?post= / #post= URL state,
 * counts views (fire-and-forget), and offers related posts.
 */

type FullPost = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  coverEmoji: string;
  coverGradient: string;
  author: string;
  readingMinutes: number;
  views: number;
  publishedAt: string | null;
};

type RelatedPost = {
  slug: string;
  title: string;
  coverEmoji: string;
  coverGradient: string;
  readingMinutes: number;
  category: string;
};

const DEFAULT_TITLE =
  typeof document !== "undefined" ? document.title : "Prother · Find the right AI tool.";

function dateLabel(iso: string | null): string {
  if (!iso) return "Unpublished";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function PostReader() {
  const { toast } = useToast();
  const open = useExplorer((s) => s.postSlug !== null);
  const slug = useExplorer((s) => s.postSlug);
  const closePost = useExplorer((s) => s.closePost);
  const openPost = useExplorer((s) => s.openPost);

  const [post, setPost] = useState<FullPost | null>(null);
  const [related, setRelated] = useState<RelatedPost[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewedFor = useRef<string | null>(null);

  // Derived: the fetched article doesn't match the requested slug yet → loading.
  const loading = slug !== null && (post === null || post.slug !== slug);

  // Deep links: auto-open the reader on mount for ?post=<slug> / #post=<slug>.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const p =
      sp.get("post") ??
      (window.location.hash.startsWith("#post=")
        ? decodeURIComponent(window.location.hash.slice(6))
        : null);
    if (p) openPost(p);
  }, []);

  // Fetch the post (state updates only in async callbacks — no sync resets;
  // stale content is masked by the derived loading flag above).
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    fetch(`/api/blog/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<{ post: FullPost; related: RelatedPost[] }>;
      })
      .then((d) => {
        if (!alive) return;
        setPost(d.post);
        setRelated(d.related);
        scrollRef.current?.scrollTo({ top: 0 });
      })
      .catch(() => {
        if (alive) {
          toast({
            title: "Post unavailable",
            description: "This article may be unpublished.",
            variant: "destructive",
          });
          closePost();
        }
      });
    return () => {
      alive = false;
    };
  }, [slug, closePost, toast]);

  // View ping — once per open per slug.
  useEffect(() => {
    if (!slug || viewedFor.current === slug) return;
    viewedFor.current = slug;
    fetch(`/api/blog/${encodeURIComponent(slug)}`, { method: "POST" }).catch(
      () => {}
    );
  }, [slug]);

  // SEO: title + meta description + JSON-LD while open; restore on close.
  useEffect(() => {
    if (!open || !post) return;
    const prevTitle = document.title;
    document.title = `${post.title} | Prother Journal`;
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    const prevDesc = meta?.content ?? null;
    if (meta) meta.content = post.excerpt;

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = "prother-post-jsonld";
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      author: { "@type": "Organization", name: post.author },
      publisher: { "@type": "Organization", name: "Prother" },
      datePublished: post.publishedAt,
      dateModified: post.publishedAt,
      articleSection: post.category,
      keywords: post.tags.join(", "),
      url: `${window.location.origin}/?post=${encodeURIComponent(post.slug)}`,
    });
    document.head.appendChild(ld);

    return () => {
      document.title = prevTitle;
      if (meta && prevDesc !== null) meta.content = prevDesc;
      document.getElementById("prother-post-jsonld")?.remove();
    };
  }, [open, post]);

  const html = useMemo(() => (post ? renderMarkdown(post.body) : ""), [post]);

  const share = useCallback(async () => {
    if (!post) return;
    const url = `${window.location.origin}/?post=${encodeURIComponent(post.slug)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: url });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  }, [post, toast]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closePost()}>
      <DialogContent
        showCloseButton
        className="flex max-h-[94vh] flex-col gap-0 overflow-hidden border-white/10 bg-coal p-0 text-white sm:max-w-3xl"
      >
        <DialogTitle className="sr-only">Journal article</DialogTitle>
        <DialogDescription className="sr-only">
          Read a Prother Journal article about discovering and choosing AI tools.
        </DialogDescription>

        {loading && (
          <div className="flex min-h-64 items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-2 border-ember border-t-transparent" />
          </div>
        )}

        {post && (
          <>
            {/* cover strip */}
            <div className="relative flex items-center gap-4 overflow-hidden border-b border-white/10 px-6 py-6 sm:px-8">
              <div
                aria-hidden
                className={cn(
                  "flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-inner",
                  post.coverGradient
                )}
              >
                {post.coverEmoji}
              </div>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tracking-[0.25em] text-ember-tint uppercase">
                  <span className="inline-flex items-center gap-1">
                    <Feather className="size-3" aria-hidden /> Prother Journal
                  </span>
                  <span className="text-white/55">{post.category}</span>
                </p>
                <h2 className="mt-1.5 text-xl leading-tight font-black tracking-tight text-white sm:text-2xl">
                  {post.title}
                </h2>
              </div>
            </div>

            {/* meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/10 bg-white/[0.02] px-6 py-2.5 font-mono text-xs tracking-wider text-white/60 uppercase sm:px-8">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3" aria-hidden />
                {dateLabel(post.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" aria-hidden />
                {post.readingMinutes} min read
              </span>
              <span>{post.author}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void share()}
                className="ml-auto h-7 gap-1.5 rounded-md px-2 font-mono text-sm tracking-wider text-white/70 uppercase hover:bg-ember/10 hover:text-ember"
              >
                <Link2 className="size-3" aria-hidden /> Copy link
              </Button>
            </div>

            {/* body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              <div
                className="post-body"
                dangerouslySetInnerHTML={{ __html: html }}
              />

              {post.tags.length > 0 && (
                <div className="mt-10 flex flex-wrap gap-2 border-t border-white/10 pt-6">
                  {post.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-white/15 px-3 py-1 font-mono text-xs tracking-wider text-white/50 uppercase"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {related.length > 0 && (
                <div className="mt-10 border-t border-white/10 pt-6">
                  <p className="font-mono text-xs tracking-[0.25em] text-white/60 uppercase">
                    Keep reading
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {related.map((r) => (
                      <button
                        key={r.slug}
                        type="button"
                        onClick={() => openPost(r.slug)}
                        className="group rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-left transition-colors hover:border-ember/40"
                      >
                        <span aria-hidden className="text-lg">
                          {r.coverEmoji}
                        </span>
                        <p className="mt-2 line-clamp-2 text-xs leading-snug font-semibold text-white/85 group-hover:text-ember">
                          {r.title}
                        </p>
                        <p className="mt-1.5 font-mono text-xs tracking-wider text-white/55 uppercase">
                          {r.readingMinutes} min · {r.category}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-10 font-mono text-xs leading-relaxed tracking-wider text-white/55 uppercase">
                Published {dateLabel(post.publishedAt)} · {post.views} views ·
                Permalink: /?post={post.slug}
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
