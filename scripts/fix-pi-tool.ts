import { createServerConvexClient } from "../src/lib/convex";
import { api } from "../convex/_generated/api";
import { PrismaClient } from "@prisma/client";
import { resolve } from "path";
import { config } from "dotenv";
import * as fs from "fs";

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
  DEV_PLATFORMS: "cmucrh2nn0006kji83fbwfgnw",
};

// Official pi.dev logo on a dark rounded plate (#0D0E12)
const piDevSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="7" fill="#0D0E12"/>
  <g transform="translate(4, 4) scale(0.042857)">
    <path fill="#F6F6F6" d="M420 280H280V140H0V0H420V280Z"/>
    <path fill="#F6F6F6" d="M560 560H420V280H560V560Z"/>
    <path fill="#F6F6F6" d="M140 560H0V140H140V280H280V420H140V560Z"/>
  </g>
</svg>`;

async function fixPiTool() {
  console.log("Connecting to Convex & SQLite...");
  const convex = createServerConvexClient();
  if (!convex) throw new Error("Convex client is not initialized");

  const logoPath = resolve(process.cwd(), "public/logos/pi-dev.svg");
  fs.writeFileSync(logoPath, piDevSvg);
  console.log("✓ Created logo asset: /logos/pi-dev.svg");

  const NOW = Date.now();
  const toolId = "cmucr_pidev_" + Math.random().toString(36).substring(2, 8);

  const piDevSpec = {
    slug: "pi-dev",
    name: "Pi",
    tagline: "Autonomous terminal-based AI coding agent",
    description: "Pi is an open terminal-based AI coding agent built for high-speed software development, codebase refactoring, and interactive CLI pairing.",
    websiteUrl: "https://pi.dev/",
    categoryLegacyId: CATEGORIES.DEV_PLATFORMS,
    pricingModel: "open_source" as const,
    startingPrice: "Free",
    pricingNote: "100% open-source terminal coding agent",
    hasApi: true,
    logoEmoji: "🥧",
    logoGradient: "from-zinc-700 to-stone-900",
    logoUrl: "/logos/pi-dev.svg",
    tagsPipe: "cli|terminal|coding-agent|open-source|developer-tools",
    makerHandle: "@pi_dev",
    status: "published" as const,
    editorsPick: true,
    curated: true,
    editorial: {
      longDescription: "Pi (pi.dev) is an autonomous, terminal-based AI coding agent engineered for high-performance software development. Operating directly inside your command-line interface, Pi navigates complex codebases, plans multi-file refactors, runs test suites, and fixes build errors in real time.\n\nDesigned for speed, transparency, and minimal distraction, Pi keeps developers in their flow state without leaving the terminal.",
      useCases: [
        {
          title: "Terminal-native paired programming",
          body: "Delegate multi-file refactorings and endpoint creation directly from your shell command line."
        },
        {
          title: "Automated build & test fix loops",
          body: "Allow Pi to run test scripts, analyze stack traces, and apply patches automatically until tests pass."
        }
      ],
      pros: [
        "Minimalist, ultra-fast terminal-native coding agent interface",
        "100% open source with complete local execution control",
        "Direct integration with terminal workflows and git version control"
      ],
      cons: [
        "Requires terminal CLI experience",
        "Configuring custom local models requires initial CLI flag setup"
      ],
      alternatives: ["cline", "aider", "oh-my-pi"]
    }
  };

  // 1. Ingest Pi (pi-dev) into Convex
  const existingConvexPage = await convex.query(api.tools.pageData, { slug: "pi-dev" });
  if (existingConvexPage?.tool?.id) {
    console.log("ℹ Convex: pi-dev exists, patching metadata and logoUrl...");
    await convex.mutation(api.adminCrud.toolPatch, {
      toolLegacyId: existingConvexPage.tool.id,
      data: {
        name: piDevSpec.name,
        tagline: piDevSpec.tagline,
        description: piDevSpec.description,
        websiteUrl: piDevSpec.websiteUrl,
        pricingModel: piDevSpec.pricingModel,
        startingPrice: piDevSpec.startingPrice,
        pricingNote: piDevSpec.pricingNote,
        hasApi: piDevSpec.hasApi,
        logoEmoji: piDevSpec.logoEmoji,
        logoGradient: piDevSpec.logoGradient,
      },
      logoUrl: piDevSpec.logoUrl,
      editorial: {
        longDescription: piDevSpec.editorial.longDescription,
        useCases: piDevSpec.editorial.useCases,
        pros: piDevSpec.editorial.pros,
        cons: piDevSpec.editorial.cons,
        alternatives: piDevSpec.editorial.alternatives,
        pricingChecked: true,
      },
      nowMs: NOW,
    });
  } else {
    console.log("✓ Convex: Creating Pi (pi-dev)...");
    const toolData = {
      id: toolId,
      slug: piDevSpec.slug,
      name: piDevSpec.name,
      tagline: piDevSpec.tagline,
      description: piDevSpec.description,
      websiteUrl: piDevSpec.websiteUrl,
      categoryLegacyId: piDevSpec.categoryLegacyId,
      pricingModel: piDevSpec.pricingModel,
      startingPrice: piDevSpec.startingPrice,
      pricingNote: piDevSpec.pricingNote,
      hasApi: piDevSpec.hasApi,
      logoEmoji: piDevSpec.logoEmoji,
      logoGradient: piDevSpec.logoGradient,
      logoUrl: piDevSpec.logoUrl,
      tagsPipe: piDevSpec.tagsPipe,
      makerHandle: piDevSpec.makerHandle,
      status: piDevSpec.status,
      editorsPick: true,
      curated: true,
      createdAt: NOW,
      editorial: {
        longDescription: piDevSpec.editorial.longDescription,
        useCases: piDevSpec.editorial.useCases,
        pros: piDevSpec.editorial.pros,
        cons: piDevSpec.editorial.cons,
        alternatives: piDevSpec.editorial.alternatives,
        pricingChecked: true,
      },
    };
    const res = await convex.mutation(api.adminCrud.toolCreate, toolData);
    console.log(`✓ Convex: Created Pi (pi-dev) (Legacy ID: ${res.id})`);
  }

  // 2. Remove erroneous pi-aside if present in Convex
  try {
    const erroneousPage = await convex.query(api.tools.pageData, { slug: "pi-aside" });
    if (erroneousPage?.tool?.id) {
      console.log("ℹ Removing erroneous pi-aside from Convex...");
      await convex.mutation(api.adminCrud.toolRemove, { toolLegacyId: erroneousPage.tool.id });
      console.log("✓ Removed pi-aside from Convex");
    }
  } catch (e: any) {
    console.log("Note on Convex pi-aside removal:", e?.message);
  }

  // 3. Ingest into SQLite
  const existingSqlite = await db.tool.findUnique({ where: { slug: "pi-dev" } });
  if (!existingSqlite) {
    await db.tool.create({
      data: {
        id: toolId,
        slug: piDevSpec.slug,
        name: piDevSpec.name,
        tagline: piDevSpec.tagline,
        description: piDevSpec.description,
        websiteUrl: piDevSpec.websiteUrl,
        categoryId: piDevSpec.categoryLegacyId,
        pricingModel: piDevSpec.pricingModel,
        startingPrice: piDevSpec.startingPrice,
        pricingNote: piDevSpec.pricingNote,
        hasApi: piDevSpec.hasApi,
        logoEmoji: piDevSpec.logoEmoji,
        logoGradient: piDevSpec.logoGradient,
        logoUrl: piDevSpec.logoUrl,
        longDescription: piDevSpec.editorial.longDescription,
        useCases: JSON.stringify(piDevSpec.editorial.useCases),
        pros: JSON.stringify(piDevSpec.editorial.pros),
        cons: JSON.stringify(piDevSpec.editorial.cons),
        alternatives: JSON.stringify(piDevSpec.editorial.alternatives),
        tags: piDevSpec.tagsPipe,
        makerHandle: piDevSpec.makerHandle,
        status: "published",
        curated: true,
        editorsPick: true,
        createdAt: new Date(),
        contentUpdatedAt: new Date(),
        pricingCheckedAt: new Date(),
        verifiedAt: new Date(),
      },
    });
    console.log("✓ SQLite: Created tool Pi (pi-dev)");
  } else {
    await db.tool.update({
      where: { slug: "pi-dev" },
      data: {
        name: piDevSpec.name,
        tagline: piDevSpec.tagline,
        description: piDevSpec.description,
        websiteUrl: piDevSpec.websiteUrl,
        categoryId: piDevSpec.categoryLegacyId,
        pricingModel: piDevSpec.pricingModel,
        startingPrice: piDevSpec.startingPrice,
        pricingNote: piDevSpec.pricingNote,
        hasApi: piDevSpec.hasApi,
        logoEmoji: piDevSpec.logoEmoji,
        logoGradient: piDevSpec.logoGradient,
        logoUrl: piDevSpec.logoUrl,
        longDescription: piDevSpec.editorial.longDescription,
        useCases: JSON.stringify(piDevSpec.editorial.useCases),
        pros: JSON.stringify(piDevSpec.editorial.pros),
        cons: JSON.stringify(piDevSpec.editorial.cons),
        alternatives: JSON.stringify(piDevSpec.editorial.alternatives),
        tags: piDevSpec.tagsPipe,
        makerHandle: piDevSpec.makerHandle,
        contentUpdatedAt: new Date(),
        pricingCheckedAt: new Date(),
      },
    });
    console.log("✓ SQLite: Updated tool Pi (pi-dev)");
  }

  // Remove erroneous pi-aside from SQLite
  try {
    await db.tool.deleteMany({ where: { slug: "pi-aside" } });
    console.log("✓ SQLite: Removed pi-aside");
  } catch (e: any) {
    console.log("SQLite pi-aside delete note:", e?.message);
  }

  // 4. Verify logo in Convex
  const verifiedPage = await convex.query(api.tools.pageData, { slug: "pi-dev" });
  console.log(`\nVerification: pi-dev -> logoUrl = ${verifiedPage?.logoUrl}`);
  if (verifiedPage?.logoUrl !== "/logos/pi-dev.svg") {
    throw new Error(`CRITICAL VERIFICATION FAILURE: expected /logos/pi-dev.svg, got ${verifiedPage?.logoUrl}`);
  }

  await db.$disconnect();
}

fixPiTool().catch((e) => {
  console.error("Fatal Error during Pi fix:", e);
  process.exit(1);
});
