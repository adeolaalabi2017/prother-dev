import { ImageResponse } from "next/og";
import { db } from "@/lib/prother";
import {
  clamp,
  GRADIENT_HEX,
  OG_COLORS as C,
  OG_FALLBACK_GRADIENT,
} from "@/lib/og";

export const dynamic = "force-dynamic";

/**
 * GET /api/og            → branded site card (1200×630)
 * GET /api/og?tool=slug  → per-tool launch card for share unfurls
 *
 * Rendered with next/og (satori) using the Prother design tokens:
 * ink black, ember orange, mono labels. Referenced from layout metadata
 * and the ?tool= generateMetadata on the root page.
 */

const MONO =
  '"Geist Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';
const SANS =
  '"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

async function getToolData(slug: string) {
  const tool = await db.tool.findUnique({
    where: { slug },
    include: {
      launch: { include: { _count: { select: { votes: true } } } },
      category: { select: { slug: true, name: true, emoji: true } },
    },
  });
  if (!tool) return null;
  return {
    name: tool.name,
    tagline: tool.tagline,
    emoji: tool.logoEmoji,
    gradient: GRADIENT_HEX[tool.logoGradient] ?? OG_FALLBACK_GRADIENT,
    category: tool.category,
    scheduled: tool.launch?.scheduled ?? false,
    launchDate: tool.launch?.launchDate ?? null,
    votes: (tool.launch?.baseUpvotes ?? 0) + (tool.launch?._count.votes ?? 0),
  };
}

async function getPostData(slug: string) {
  const post = await db.post.findUnique({ where: { slug } });
  if (!post || post.status !== "published") return null;
  return {
    title: post.title,
    excerpt: post.excerpt,
    emoji: post.coverEmoji,
    gradient: GRADIENT_HEX[post.coverGradient] ?? OG_FALLBACK_GRADIENT,
    category: post.category,
    readingMinutes: post.readingMinutes,
  };
}

function Chip({
  children,
  borderColor,
  color,
}: {
  children: React.ReactNode;
  borderColor: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        border: `1px solid ${borderColor}`,
        borderRadius: 999,
        padding: "10px 22px",
        fontFamily: MONO,
        fontSize: 20,
        letterSpacing: 3,
        color,
      }}
    >
      {children}
    </div>
  );
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const postSlug = sp.get("post");
  const slug = sp.get("tool");
  const tool = postSlug ? null : slug ? await getToolData(slug) : null;
  const post = postSlug ? await getPostData(postSlug) : null;

  // Shared shell: ink canvas, ember glow top-left, faint dot texture.
  const shell = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "56px 64px",
    backgroundColor: C.ink,
    backgroundImage: `radial-gradient(720px 420px at 12% -8%, rgba(255,106,0,0.28), rgba(255,106,0,0) 60%), radial-gradient(900px 520px at 100% 110%, rgba(255,106,0,0.10), rgba(255,106,0,0) 55%)`,
  } as const;

  const topBar = (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${C.ember}, #c2410c)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#0a0a0a",
          fontSize: 24,
          fontWeight: 900,
          fontFamily: SANS,
        }}
      >
        P
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 22,
          letterSpacing: 6,
          color: C.ember,
        }}
      >
        PROTHER
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 18,
          letterSpacing: 4,
          color: C.white35,
          marginLeft: "auto",
        }}
      >
        DAILY AI LAUNCH FEED · 00:00 UTC
      </div>
    </div>
  );

  const bottomBar = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: `2px solid rgba(255,106,0,0.55)`,
        paddingTop: 28,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            backgroundColor: C.ember,
          }}
        />
        <div
          style={{
            fontFamily: MONO,
            fontSize: 20,
            letterSpacing: 4,
            color: C.white50,
          }}
        >
          PROTHER.DEV
        </div>
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 18,
          letterSpacing: 3,
          color: C.white35,
          flexShrink: 0,
        }}
      >
        VOTE · LAUNCH · REPEAT
      </div>
    </div>
  );

  const element = tool ? (
    <div style={shell}>
      {topBar}
      <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
        <div
          style={{
            width: 176,
            height: 176,
            borderRadius: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 88,
            border: "2px solid rgba(255,255,255,0.16)",
            backgroundImage: `linear-gradient(135deg, ${tool.gradient[0]}, ${tool.gradient[1]})`,
            boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          }}
        >
          {tool.emoji}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 800,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: MONO,
              fontSize: 20,
              letterSpacing: 5,
              color: C.ember,
              marginBottom: 14,
            }}
          >
            {tool.scheduled ? "GOES LIVE ON PROTHER" : "LIVE ON PROTHER"}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: tool.name.length > 16 ? 68 : 84,
              fontWeight: 900,
              color: C.white,
              letterSpacing: -2,
              lineHeight: 1.05,
              fontFamily: SANS,
            }}
          >
            {clamp(tool.name, 22)}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: C.white70,
              marginTop: 14,
              lineHeight: 1.3,
              fontFamily: SANS,
            }}
          >
            {clamp(tool.tagline, 72)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Chip borderColor={C.white18} color={C.white70}>
          {tool.category.emoji} {tool.category.name.toUpperCase()}
        </Chip>
        <Chip borderColor="rgba(255,106,0,0.45)" color={C.ember}>
          {tool.votes} VOTES
        </Chip>
      </div>
      {bottomBar}
    </div>
  ) : post ? (
    <div style={shell}>
      {topBar}
      <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
        <div
          style={{
            width: 156,
            height: 156,
            borderRadius: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 80,
            border: "2px solid rgba(255,255,255,0.16)",
            backgroundImage: `linear-gradient(135deg, ${post.gradient[0]}, ${post.gradient[1]})`,
            boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          }}
        >
          {post.emoji}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 820,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: MONO,
              fontSize: 20,
              letterSpacing: 5,
              color: C.ember,
              marginBottom: 14,
            }}
          >
            PROTHER JOURNAL · {post.category.toUpperCase()}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: post.title.length > 44 ? 56 : post.title.length > 26 ? 68 : 80,
              fontWeight: 900,
              color: C.white,
              letterSpacing: -2,
              lineHeight: 1.06,
              fontFamily: SANS,
            }}
          >
            {clamp(post.title, 64)}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: C.white70,
              marginTop: 16,
              lineHeight: 1.35,
              fontFamily: SANS,
            }}
          >
            {clamp(post.excerpt, 90)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Chip borderColor={C.white18} color={C.white70}>
          {post.readingMinutes} MIN READ
        </Chip>
        <Chip borderColor="rgba(255,106,0,0.45)" color={C.ember}>
          NOTES FROM THE LAUNCH LAYER
        </Chip>
      </div>
      {bottomBar}
    </div>
  ) : (
    <div style={shell}>
      {topBar}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontFamily: MONO,
            fontSize: 22,
            letterSpacing: 6,
            color: C.ember,
            marginBottom: 20,
          }}
        >
          THE FRONT PAGE OF AI LAUNCHES
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 96,
            fontWeight: 900,
            color: C.white,
            letterSpacing: -4,
            lineHeight: 1.02,
            fontFamily: SANS,
          }}
        >
          <span>Where AI products get</span>
          <span>
            discovered.
            <span style={{ color: C.ember }}>_</span>
          </span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: C.white50,
            marginTop: 26,
            fontFamily: SANS,
          }}
        >
          What launched, what&apos;s climbing, and what&apos;s actually worth your
          time.
        </div>
      </div>
      {bottomBar}
    </div>
  );

  return new ImageResponse(element, {
    width: 1200,
    height: 630,
  });
}
