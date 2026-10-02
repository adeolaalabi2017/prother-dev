import { NextRequest, NextResponse } from "next/server";
import { createServerConvexClient } from "@/lib/convex";
import { shadowBadgeTool } from "@/lib/data";

export const dynamic = "force-dynamic";

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

function renderBadgeSvg({
  label,
  sublabel,
  theme = "dark",
  isPick = false,
}: {
  label: string;
  sublabel?: string;
  theme?: string;
  isPick?: boolean;
}): string {
  const isLight = theme === "light";
  const bg = isLight ? "#F8F6F1" : "#0D0E12";
  const bgEnd = isLight ? "#EFECE4" : "#14151B";
  const border = isLight ? "#E0DCD2" : "#22252C";
  const brandText = isLight ? "#1A1714" : "#FFFFFF";
  const subText = isPick ? "#FF8A3D" : isLight ? "#5C564E" : "#9E9AA6";
  const ember = "#FF6A00";

  const statusText = sublabel ? `${label} · ${sublabel}` : label;
  const escapedStatus = escapeXml(statusText.toUpperCase());

  // Approximate character width calculation
  const charWidth = 7.4;
  const statusWidth = Math.ceil(escapedStatus.length * charWidth);
  const totalWidth = Math.max(198, 98 + statusWidth + 18);
  const height = 34;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}" role="img" aria-label="Prother: ${escapedStatus}">
  <defs>
    <linearGradient id="protherBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="100%" stop-color="${bgEnd}" />
    </linearGradient>
  </defs>
  <rect width="${totalWidth}" height="${height}" rx="8" fill="url(#protherBadgeGrad)" stroke="${border}" stroke-width="1"/>

  <!-- Brand Glyph -->
  <g transform="translate(10, 8)">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="${ember}" stroke="#FF8A3D" stroke-width="1.5">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  </g>
  <text x="34" y="21.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="900" letter-spacing="1.2" fill="${brandText}">PROTHER</text>

  <!-- Divider -->
  <line x1="93" y1="9" x2="93" y2="25" stroke="${border}" stroke-width="1.2" />

  <!-- Badge Status Details -->
  <text x="103" y="21.5" font-family="ui-monospace, 'SF Mono', Menlo, Consolas, monospace" font-size="10.5" font-weight="600" letter-spacing="0.8" fill="${subText}">
    ${escapedStatus}
  </text>
</svg>`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sp = req.nextUrl.searchParams;
  const theme = sp.get("theme") === "light" ? "light" : "dark";

  try {
    const client = createServerConvexClient();
    if (!client) {
      return new NextResponse("Service unavailable", { status: 503 });
    }

    const tool = await shadowBadgeTool(client, slug);

    if (!tool) {
      const notFoundSvg = renderBadgeSvg({
        label: "NOT FOUND",
        theme,
      });
      return new NextResponse(notFoundSvg, {
        status: 404,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      });
    }

    let label = "VERIFIED";
    let sublabel: string | undefined;
    let isPick = false;

    if (tool.editorsPick) {
      label = "EDITOR'S PICK";
      isPick = true;
    } else if (tool.rating) {
      label = "VERIFIED";
      sublabel = `${tool.rating.toFixed(1)} ★`;
    } else {
      label = "FEATURED";
    }

    const svg = renderBadgeSvg({
      label,
      sublabel,
      theme,
      isPick,
    });

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[api:badge] failed:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
