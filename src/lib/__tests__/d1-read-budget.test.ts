import { beforeEach, describe, expect, mock, test } from "bun:test";
import { categories, siteSettings, tools } from "@/lib/d1/schema";

/**
 * D1 free tier bills rows_read, and count(*) reads one index row per match.
 * These tests pin the hot paths to their read budget.
 */

let tablesRead: unknown[] = [];
let settingsRows: { key: string; value: string }[] = [];
let toolRows: Record<string, unknown>[] = [];
let categoryRows: Record<string, unknown>[] = [];

function rowsFor(table: unknown) {
  if (table === siteSettings) return settingsRows;
  if (table === tools) return toolRows;
  if (table === categories) return categoryRows;
  return [];
}

function chain(rows: unknown[]) {
  const p = Promise.resolve(rows);
  const self = Object.assign(p, {
    where: () => self,
    groupBy: () => self,
    orderBy: () => self,
    limit: () => self,
  });
  return self;
}

const fakeDb = {
  select: () => ({
    from: (table: unknown) => {
      tablesRead.push(table);
      return chain(rowsFor(table));
    },
  }),
  all: async () => {
    tablesRead.push(tools);
    return [{ tag: "agents", n: 2 }];
  },
};

let kvStore = new Map<string, string>();
let kvPuts: { key: string; ttl?: number }[] = [];
let kvGetError = false;

const fakeKv = {
  get: async (key: string) => {
    if (kvGetError) throw new Error("kv down");
    return kvStore.get(key) ?? null;
  },
  put: async (key: string, value: string, opts?: { expirationTtl?: number }) => {
    kvPuts.push({ key, ttl: opts?.expirationTtl });
    kvStore.set(key, value);
  },
};

mock.module("@/lib/d1/client", () => ({ getD1: async () => fakeDb }));
mock.module("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({ env: { CACHE: fakeKv } }),
}));

const { d1SiteGet, d1SiteSettings, d1Homepage, d1LiveCountsByCategory } = await import(
  "@/lib/d1/queries"
);
const { d1CompareCategories } = await import("@/lib/d1/content");
const { kvCached } = await import("@/lib/d1/kv-cache");

beforeEach(() => {
  tablesRead = [];
  kvStore = new Map();
  kvPuts = [];
  kvGetError = false;
  settingsRows = [{ key: "seo.defaultTitle", value: "Prother" }];
  toolRows = [{ n: 5, categoryId: "c1", slug: "tool-a" }];
  categoryRows = [{ n: 2, id: "c1", slug: "agents", name: "Agents", emoji: "x", sortOrder: 1 }];
});

describe("d1LiveCountsByCategory", () => {
  test("groups once, then serves the map from KV", async () => {
    expect(await d1LiveCountsByCategory()).toEqual({ c1: 5 });
    expect(tablesRead).toEqual([tools]);

    tablesRead = [];
    expect(await d1LiveCountsByCategory()).toEqual({ c1: 5 });
    expect(tablesRead).toHaveLength(0);
  });

  test("does not cache an empty catalog", async () => {
    toolRows = [];
    expect(await d1LiveCountsByCategory()).toBeNull();
    expect(kvPuts).toHaveLength(0);
  });
});

describe("d1CompareCategories", () => {
  test("uses cached counts instead of loading live tool rows", async () => {
    const expected = [{ slug: "agents", name: "Agents", emoji: "x", toolCount: 5 }];
    expect(await d1CompareCategories()).toEqual(expected);

    tablesRead = [];
    expect(await d1CompareCategories()).toEqual(expected);
    expect(tablesRead).toEqual([categories]);
  });

  test("an empty catalog still lists categories with zero tools", async () => {
    toolRows = [];
    expect(await d1CompareCategories()).toEqual([
      { slug: "agents", name: "Agents", emoji: "x", toolCount: 0 },
    ]);
  });
});

describe("d1SiteSettings", () => {
  test("reads site_settings only, never tools or categories", async () => {
    expect(await d1SiteSettings()).toEqual({ "seo.defaultTitle": "Prother" });
    expect(tablesRead).toEqual([siteSettings]);
  });

  test("returns null on an empty store so callers fall back", async () => {
    settingsRows = [];
    expect(await d1SiteSettings()).toBeNull();
  });
});

describe("d1SiteGet", () => {
  test("counts tools once, then serves counts from KV", async () => {
    const first = await d1SiteGet();
    expect(first?.stats.tools).toBe(5);
    expect(first?.stats.categories).toBe(2);
    expect(tablesRead.filter((t) => t === tools)).toHaveLength(1);

    tablesRead = [];
    const second = await d1SiteGet();
    expect(second).toEqual(first);
    expect(tablesRead).toEqual([siteSettings]);
  });

  test("always reads settings fresh", async () => {
    await d1SiteGet();
    settingsRows = [{ key: "seo.defaultTitle", value: "Edited" }];
    expect((await d1SiteGet())?.settings["seo.defaultTitle"]).toBe("Edited");
  });

  test("does not cache an empty store", async () => {
    toolRows = [{ n: 0 }];
    categoryRows = [{ n: 0 }];
    expect(await d1SiteGet()).toBeNull();
    expect(kvPuts).toHaveLength(0);
  });
});

describe("d1Homepage", () => {
  test("second render does no D1 reads", async () => {
    const first = await d1Homepage();
    expect(first?.tagCounts).toEqual({ agents: 2 });

    tablesRead = [];
    expect(await d1Homepage()).toEqual(first);
    expect(tablesRead).toHaveLength(0);
  });

  test("does not cache an empty catalog", async () => {
    toolRows = [];
    expect(await d1Homepage()).toBeNull();
    expect(kvPuts).toHaveLength(0);
  });
});

describe("kvCached", () => {
  test("writes with the requested TTL", async () => {
    await kvCached("k", 600, async () => ({ a: 1 }));
    expect(kvPuts).toEqual([{ key: "k", ttl: 600 }]);
  });

  test("KV outage falls through to the loader", async () => {
    kvGetError = true;
    expect(await kvCached("k", 600, async () => ({ a: 1 }))).toEqual({ a: 1 });
  });

  test("corrupt cached JSON falls through to the loader", async () => {
    kvStore.set("k", "{not json");
    expect(await kvCached("k", 600, async () => ({ a: 1 }))).toEqual({ a: 1 });
  });
});
