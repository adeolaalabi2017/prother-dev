import { createServerConvexClient } from "../src/lib/convex";
import { api } from "../convex/_generated/api";
import { PrismaClient } from "@prisma/client";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const db = new PrismaClient({
  datasources: {
    db: {
      url: `file:${resolve(process.cwd(), "db/custom.db")}`,
    },
  },
});

const CATEGORIES = {
  DATA_ANALYTICS: "cmucrh2nm0004kji8j0rbkt76",
};

const clarityTool = {
  slug: "microsoft-clarity",
  name: "Microsoft Clarity",
  tagline: "Free behavioral analytics with heatmaps and session recordings",
  description: "Microsoft Clarity is a free behavioral analytics tool that visualizes user interactions through session replays, click and scroll heatmaps, and AI Copilot summaries with zero traffic limits.",
  websiteUrl: "https://clarity.microsoft.com/",
  githubUrl: "https://github.com/microsoft/clarity",
  categoryLegacyId: CATEGORIES.DATA_ANALYTICS,
  pricingModel: "free" as const,
  startingPrice: "$0/mo",
  pricingNote: "Free forever with unlimited traffic and sessions",
  hasApi: true,
  logoEmoji: "👁️",
  logoGradient: "from-blue-600 to-indigo-900",
  tagsPipe: "behavioral-analytics|session-replay|heatmaps|user-behavior|microsoft|free-analytics",
  makerHandle: "@msftclarity",
  editorial: {
    longDescription: "Microsoft Clarity is a free user behavioral analytics platform built by Microsoft. It records session replays and produces click and scroll heatmaps to reveal how visitors navigate, interact, and encounter friction across web applications.\n\nUnlike traditional web analytics tools that meter page views or restrict session recordings behind paid enterprise tiers, Clarity provides unlimited recordings, GDPR and CCPA compliance out of the box, and built-in AI Copilot session takeaways without sampling or hidden charges.",
    useCases: [
      {
        title: "Session replay and user struggle detection",
        body: "Watch user sessions to spot rage clicks, dead clicks, excessive scrolling, and JavaScript errors."
      },
      {
        title: "Heatmap visualization across breakpoints",
        body: "Analyze click maps and scroll depth across desktop, tablet, and mobile to optimize conversions."
      },
      {
        title: "Clarity Copilot automated session insights",
        body: "Summarize session recordings into concise bullet points using generative AI to pinpoint blockers faster."
      }
    ],
    pros: [
      "Completely free with unlimited traffic, sessions, and heatmap generation",
      "Built-in AI Copilot summarizes user sessions and highlights friction areas",
      "Native integration with Google Analytics, Shopify, and modern web frameworks",
      "Built-in privacy masking complies with GDPR and CCPA out of the box"
    ],
    cons: [
      "Focused on qualitative user behavior rather than complex custom funnel attribution",
      "Data retention for recordings is 30 days unless marked as favorites"
    ],
    alternatives: ["posthog", "hotjar", "mixpanel"]
  }
};

async function main() {
  const NOW = Date.now();
  const logoUrl = "/logos/microsoft-clarity.png";
  const toolId = "cmucrh2clarity0000000000001";

  console.log("Checking Convex connection...");
  const convex = createServerConvexClient();

  if (convex) {
    try {
      console.log("Convex client initialized. Syncing to Convex...");
      const existing = await convex.query(api.tools.pageData, { slug: clarityTool.slug });
      if (existing?.tool?.id) {
        await convex.mutation(api.adminCrud.toolPatch, {
          toolLegacyId: existing.tool.id,
          data: {
            name: clarityTool.name,
            tagline: clarityTool.tagline,
            description: clarityTool.description,
            websiteUrl: clarityTool.websiteUrl,
            githubUrl: clarityTool.githubUrl,
            categoryLegacyId: clarityTool.categoryLegacyId,
            pricingModel: clarityTool.pricingModel,
            startingPrice: clarityTool.startingPrice,
            pricingNote: clarityTool.pricingNote,
            hasApi: clarityTool.hasApi,
            logoEmoji: clarityTool.logoEmoji,
            logoGradient: clarityTool.logoGradient,
            tagsPipe: clarityTool.tagsPipe,
            makerHandle: clarityTool.makerHandle,
          },
          logoUrl,
          editorial: {
            longDescription: clarityTool.editorial.longDescription,
            useCases: clarityTool.editorial.useCases,
            pros: clarityTool.editorial.pros,
            cons: clarityTool.editorial.cons,
            alternatives: clarityTool.editorial.alternatives,
            pricingChecked: true,
          },
          nowMs: NOW,
        });
        console.log(`✓ Convex: Patched existing tool ${clarityTool.slug}`);
      } else {
        const toolData = {
          id: toolId,
          slug: clarityTool.slug,
          name: clarityTool.name,
          tagline: clarityTool.tagline,
          description: clarityTool.description,
          websiteUrl: clarityTool.websiteUrl,
          categoryLegacyId: clarityTool.categoryLegacyId,
          pricingModel: clarityTool.pricingModel,
          startingPrice: clarityTool.startingPrice,
          pricingNote: clarityTool.pricingNote,
          hasApi: clarityTool.hasApi,
          logoEmoji: clarityTool.logoEmoji,
          logoGradient: clarityTool.logoGradient,
          logoUrl,
          tagsPipe: clarityTool.tagsPipe,
          makerHandle: clarityTool.makerHandle,
          status: "live",
          editorsPick: true,
          curated: true,
          createdAt: NOW,
          editorial: {
            longDescription: clarityTool.editorial.longDescription,
            useCases: clarityTool.editorial.useCases,
            pros: clarityTool.editorial.pros,
            cons: clarityTool.editorial.cons,
            alternatives: clarityTool.editorial.alternatives,
            pricingChecked: true,
          },
        };
        const res = await convex.mutation(api.adminCrud.toolCreate, toolData);
        console.log(`✓ Convex: Created tool ${clarityTool.name} (ID: ${res.id})`);
        if (clarityTool.githubUrl) {
          await convex.mutation(api.adminCrud.toolPatch, {
            toolLegacyId: res.id,
            data: { githubUrl: clarityTool.githubUrl },
            nowMs: NOW,
          });
        }
      }
    } catch (err: any) {
      console.error("Convex error:", err?.message);
    }
  } else {
    console.log("No remote Convex URL configured; continuing with SQLite custom.db sync.");
  }

  // SQLite custom.db sync
  try {
    const existing = await db.tool.findUnique({ where: { slug: clarityTool.slug } });
    if (!existing) {
      await db.tool.create({
        data: {
          id: toolId,
          slug: clarityTool.slug,
          name: clarityTool.name,
          tagline: clarityTool.tagline,
          description: clarityTool.description,
          websiteUrl: clarityTool.websiteUrl,
          githubUrl: clarityTool.githubUrl,
          categoryId: clarityTool.categoryLegacyId,
          pricingModel: clarityTool.pricingModel,
          startingPrice: clarityTool.startingPrice,
          pricingNote: clarityTool.pricingNote,
          hasApi: clarityTool.hasApi,
          logoEmoji: clarityTool.logoEmoji,
          logoGradient: clarityTool.logoGradient,
          logoUrl,
          longDescription: clarityTool.editorial.longDescription,
          useCases: JSON.stringify(clarityTool.editorial.useCases),
          pros: JSON.stringify(clarityTool.editorial.pros),
          cons: JSON.stringify(clarityTool.editorial.cons),
          alternatives: JSON.stringify(clarityTool.editorial.alternatives),
          tags: clarityTool.tagsPipe,
          makerHandle: clarityTool.makerHandle,
          status: "live",
          curated: true,
          editorsPick: true,
          createdAt: new Date(),
          contentUpdatedAt: new Date(),
          pricingCheckedAt: new Date(),
          verifiedAt: new Date(),
        },
      });
      console.log(`✓ SQLite: Created tool ${clarityTool.name}`);
    } else {
      await db.tool.update({
        where: { slug: clarityTool.slug },
        data: {
          name: clarityTool.name,
          tagline: clarityTool.tagline,
          description: clarityTool.description,
          websiteUrl: clarityTool.websiteUrl,
          githubUrl: clarityTool.githubUrl,
          categoryId: clarityTool.categoryLegacyId,
          pricingModel: clarityTool.pricingModel,
          startingPrice: clarityTool.startingPrice,
          pricingNote: clarityTool.pricingNote,
          hasApi: clarityTool.hasApi,
          logoEmoji: clarityTool.logoEmoji,
          logoGradient: clarityTool.logoGradient,
          logoUrl,
          longDescription: clarityTool.editorial.longDescription,
          useCases: JSON.stringify(clarityTool.editorial.useCases),
          pros: JSON.stringify(clarityTool.editorial.pros),
          cons: JSON.stringify(clarityTool.editorial.cons),
          alternatives: JSON.stringify(clarityTool.editorial.alternatives),
          tags: clarityTool.tagsPipe,
          makerHandle: clarityTool.makerHandle,
          contentUpdatedAt: new Date(),
          pricingCheckedAt: new Date(),
        },
      });
      console.log(`✓ SQLite: Updated tool ${clarityTool.name}`);
    }

    const verifyRecord = await db.tool.findUnique({ where: { slug: clarityTool.slug } });
    if (verifyRecord?.logoUrl !== logoUrl) {
      throw new Error(`Verification failed: expected ${logoUrl}, got ${verifyRecord?.logoUrl}`);
    }
    console.log(`✓ Verified in SQLite: ${verifyRecord.slug} -> logoUrl: ${verifyRecord.logoUrl}`);
  } catch (err: any) {
    console.error("SQLite error:", err?.message);
    throw err;
  }
}

main()
  .catch((e) => {
    console.error("Script failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
