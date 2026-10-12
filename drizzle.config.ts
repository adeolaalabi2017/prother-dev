import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/d1/schema.ts",
  out: "./drizzle",
});
