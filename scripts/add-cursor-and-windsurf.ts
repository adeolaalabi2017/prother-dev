/**
 * Script to add Cursor and Windsurf to Prother.dev.
 * Writes to both Convex (cloud source of truth) and SQLite (db/custom.db).
 * Run: bun scripts/add-cursor-and-windsurf.ts
 */
import { createServerConvexClient } from "../src/lib/convex";
import { api } from "../convex/_generated/api";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? "file:./db/custom.db" } },
});

const DEV_PLATFORMS_LEGACY_ID = "cmucrh2nn0006kji83fbwfgnw";
const NOW = Date.now();

const CURSOR_DATA = {
  id: "cmucr_cursor_" + Math.random().toString(36).substring(2, 9),
  slug: "cursor",
  name: "Cursor",
  tagline: "The AI-first code editor built for pair programming",
  description:
    "Cursor is a fork of VS Code built from the ground up for AI-first programming. It features multi-file editing with Composer, intelligent tab completions with cursor prediction, natural language codebase indexing, and terminal integration.",
  websiteUrl: "https://cursor.com",
  categoryLegacyId: DEV_PLATFORMS_LEGACY_ID,
  pricingModel: "freemium",
  startingPrice: "$20 per month",
  pricingNote:
    "Hobby plan is free with limited fast requests. Pro is $20 per month with 500 fast requests and unlimited slow requests.",
  hasApi: true,
  logoEmoji: "⚡",
  logoGradient: "from-blue-600 to-indigo-900",
  logoUrl: "https://befitting-moose-925.convex.cloud/api/storage/1e38b910-7f88-48e2-8a10-3c516b6bf420",
  tagsPipe: "coding|ide|developer-tools|agents|freemium",
  makerHandle: "@cursor",
  status: "live",
  editorsPick: true,
  curated: true,
  createdAt: NOW,
  editorial: {
    longDescription:
      "Cursor is an AI-powered code editor forked from VS Code, engineered to integrate language models directly into software engineering workflows. It retains full compatibility with existing VS Code extensions, themes, and keybindings while introducing dedicated AI systems such as Composer for multi-file generation and refactoring, cursor prediction for tab autocompletions, and semantic codebase indexing.\n\nThe editor embeds your entire repository into local or remote vector indexes to provide accurate answers to codebase-wide questions without manual context pasting. Developers can choose between frontier models like Claude 3.5 Sonnet, GPT-4o, or bring their own API keys. It excels at complex, cross-file feature implementations and interactive debugging, though heavy users may deplete monthly fast-request allowances during intensive development sprints.",
    useCases: [
      {
        title: "Refactor multi-file architectures with Composer",
        body: "Open Composer, reference entire modules, and let Cursor modify multiple files, imports, and exports simultaneously.",
      },
      {
        title: "Semantic codebase search and onboarding",
        body: "Ask natural language questions about how authentication, data pipelines, or routes work across thousands of files.",
      },
      {
        title: "Cursor prediction inline autocomplete",
        body: "Accept speculative tab completions that predict where your cursor should navigate next, accelerating repetitive edits.",
      },
      {
        title: "Bring your own API key for frontier models",
        body: "Plug in custom OpenAI or Anthropic API keys to bypass request limits and access the newest models directly.",
      },
    ],
    pros: [
      "Native fork of VS Code with instant 1-click import of all extensions and keybindings",
      "Composer provides seamless multi-file editing and automated diff reviews",
      "Supports bringing your own Anthropic or OpenAI API keys",
      "Fast semantic codebase indexing with symbol search",
    ],
    cons: [
      "Fast request allowance depletes rapidly during heavy Composer usage",
      "Monorepo indexing can consume significant local CPU and memory resources",
      "Proprietary fork means upstream VS Code updates lag behind official releases",
    ],
    alternatives: ["windsurf", "ollama", "langchain"],
    pricingChecked: true,
  },
};

const WINDSURF_DATA = {
  id: "cmucr_windsurf_" + Math.random().toString(36).substring(2, 9),
  slug: "windsurf",
  name: "Windsurf",
  tagline: "The agentic AI IDE with flow state and Cascade agent",
  description:
    "Windsurf is Codeium's AI-powered IDE designed to keep developers in flow. Powered by the Cascade agent, it understands your full codebase context, coordinates multi-step commands and file modifications, and collaborates in real time.",
  websiteUrl: "https://codeium.com/windsurf",
  categoryLegacyId: DEV_PLATFORMS_LEGACY_ID,
  pricingModel: "freemium",
  startingPrice: "$15 per month",
  pricingNote:
    "Free tier includes unlimited tab completions and 25 Cascade credits. Pro tier is $15 per month for unlimited fast premium requests.",
  hasApi: true,
  logoEmoji: "🏄",
  logoGradient: "from-teal-500 to-cyan-800",
  logoUrl: "https://befitting-moose-925.convex.cloud/api/storage/d526e540-74da-42b4-9fb8-bce132459aa0",
  tagsPipe: "coding|ide|developer-tools|agents|freemium",
  makerHandle: "@codeium",
  status: "live",
  editorsPick: true,
  curated: true,
  createdAt: NOW,
  editorial: {
    longDescription:
      "Windsurf is an AI-first IDE developed by Codeium that focuses on collaborative developer flow state and agentic multi-step tasks. Built on a customized VS Code foundation, Windsurf introduces Cascade, an autonomous coding agent that deeply understands project architectures, runs terminal commands, inspects build errors, and modifies multiple files in sequence.\n\nWindsurf distinguishes between inline Supercomplete suggestions and high-level agentic Flows that iteratively write code, inspect lint outputs, and fix bugs. By combining low-latency autocomplete with multi-step reasoning, it aims to eliminate the friction of switching between chat panels and the editor. It is well suited for developers seeking proactive assistance across large codebases, though its Cascade credit model requires active management on demanding workflows.",
    useCases: [
      {
        title: "Autonomous multi-step coding with Cascade",
        body: "Delegate full tasks from prompt to execution: Cascade writes files, executes terminal tests, and resolves errors iteratively.",
      },
      {
        title: "Low-latency Supercomplete typing",
        body: "Experience fast, predictive tab completions that infer intent from recent edits and open tabs.",
      },
      {
        title: "Collaborative terminal and shell automation",
        body: "Allow the agent to suggest and run bash commands, install packages, and verify server outputs in the integrated terminal.",
      },
      {
        title: "Deep codebase context indexing",
        body: "Index monorepos to generate context-aware unit tests and architectural migrations with zero manual context copying.",
      },
    ],
    pros: [
      "Cascade agent iteratively runs terminal commands and fixes errors autonomously",
      "Supercomplete autocomplete is exceptionally fast with accurate intent prediction",
      "Generous free tier with unlimited autocomplete and monthly Cascade credits",
      "Pro tier is competitive at $15 per month versus industry standards",
    ],
    cons: [
      "Cascade credits require monitoring during complex agentic coding tasks",
      "Relatively newer ecosystem compared to vanilla VS Code extensions",
      "Occasional overly eager agent suggestions require manual steering",
    ],
    alternatives: ["cursor", "ollama", "langchain"],
    pricingChecked: true,
  },
};

// Check for em/en dashes
for (const tool of [CURSOR_DATA, WINDSURF_DATA]) {
  const texts = [
    tool.description,
    tool.tagline,
    tool.editorial.longDescription,
    ...tool.editorial.useCases.flatMap((u) => [u.title, u.body]),
    ...tool.editorial.pros,
    ...tool.editorial.cons,
    tool.pricingNote,
  ];
  if (texts.some((t) => /[\u2014\u2013]/.test(t ?? ""))) {
    console.error(`✗ ${tool.slug}: em or en dash found in copy!`);
    process.exit(1);
  }
}

async function main() {
  console.log("Connecting to Convex...");
  const convex = createServerConvexClient();
  if (!convex) {
    throw new Error("Convex client could not be created. Check NEXT_PUBLIC_CONVEX_URL.");
  }

  // 1. Insert into Convex
  console.log("Adding tools to Convex...");
  for (const tool of [CURSOR_DATA, WINDSURF_DATA]) {
    try {
      const id = await convex.mutation(api.adminCrud.toolCreate, tool);
      console.log(`✓ Convex: Added ${tool.name} (${tool.slug}) -> ID: ${id}`);
    } catch (err: any) {
      if (err.message?.includes("slug_taken")) {
        console.log(`ℹ Convex: ${tool.name} already exists, skipping create`);
      } else {
        console.error(`✗ Convex error for ${tool.name}:`, err);
        throw err;
      }
    }
  }

  // 2. Insert into SQLite (db/custom.db)
  console.log("Adding tools to SQLite...");
  for (const tool of [CURSOR_DATA, WINDSURF_DATA]) {
    const existing = await db.tool.findUnique({ where: { slug: tool.slug } });
    if (!existing) {
      await db.tool.create({
        data: {
          id: tool.id,
          slug: tool.slug,
          name: tool.name,
          tagline: tool.tagline,
          description: tool.description,
          websiteUrl: tool.websiteUrl,
          categoryId: tool.categoryLegacyId,
          pricingModel: tool.pricingModel,
          startingPrice: tool.startingPrice,
          pricingNote: tool.pricingNote,
          hasApi: tool.hasApi,
          logoEmoji: tool.logoEmoji,
          logoGradient: tool.logoGradient,
          tags: tool.tagsPipe,
          makerHandle: tool.makerHandle,
          status: tool.status,
          editorsPick: tool.editorsPick,
          curated: tool.curated,
          claimed: false,
          pinned: 0,
        },
      });
      console.log(`✓ SQLite: Created tool ${tool.name}`);
    }

    // Apply editorial enrichment in SQLite
    await db.$executeRawUnsafe(
      `UPDATE Tool SET
         longDescription = ?,
         useCases = ?,
         pros = ?,
         cons = ?,
         alternatives = ?,
         pricingModel = ?,
         startingPrice = ?,
         pricingNote = ?,
         pricingCheckedAt = ?,
         contentUpdatedAt = ?
       WHERE slug = ?`,
      tool.editorial.longDescription,
      JSON.stringify(tool.editorial.useCases),
      JSON.stringify(tool.editorial.pros),
      JSON.stringify(tool.editorial.cons),
      tool.editorial.alternatives.join("|"),
      tool.pricingModel,
      tool.startingPrice,
      tool.pricingNote,
      new Date(),
      new Date(),
      tool.slug
    );
    console.log(`✓ SQLite: Enriched editorial fields for ${tool.name}`);
  }

  // 3. Verify in Convex
  console.log("Verifying in Convex...");
  const cursorCheck = await convex.query(api.tools.detail, { slug: "cursor" });
  const windsurfCheck = await convex.query(api.tools.detail, { slug: "windsurf" });

  if ("error" in cursorCheck) {
    throw new Error(`Cursor lookup failed: ${cursorCheck.error}`);
  }
  if ("error" in windsurfCheck) {
    throw new Error(`Windsurf lookup failed: ${windsurfCheck.error}`);
  }

  console.log(`✓ Verification successful:`);
  console.log(`  - Cursor: ${cursorCheck.name}, category: ${cursorCheck.category.name}, alternatives: ${cursorCheck.alternatives.map((a: any) => a.name).join(", ")}`);
  console.log(`  - Windsurf: ${windsurfCheck.name}, category: ${windsurfCheck.category.name}, alternatives: ${windsurfCheck.alternatives.map((a: any) => a.name).join(", ")}`);
}

main()
  .catch((err) => {
    console.error("Execution failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
