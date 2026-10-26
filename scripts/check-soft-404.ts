/**
 * HTTP regression smoke test for the Next.js streamed soft-404.
 *
 * Run against a local production build or Cloudflare preview:
 *   PROTHER_BASE_URL=http://localhost:3000 bun run test:soft-404
 *   PROTHER_VALID_TOOL_SLUG=cline PROTHER_BASE_URL=http://localhost:3000 bun run test:soft-404
 *
 * This script intentionally defaults to localhost and refuses the production
 * hostname unless explicitly opted in.
 */
const baseUrl = (process.env.PROTHER_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const base = new URL(baseUrl);

if (
  base.hostname === "prother.dev" ||
  base.hostname === "www.prother.dev"
) {
  throw new Error(
    "Refusing to run against production. Use a local build/preview, or set a non-production PROTHER_BASE_URL.",
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function request(path: string) {
  return fetch(new URL(path, baseUrl), { redirect: "manual" });
}

const home = await request("/");
const homeHtml = await home.text();
assert(home.status === 200, `Homepage expected HTTP 200, received ${home.status}`);
assert(/<h1\b/i.test(homeHtml), "Homepage H1 is missing from initial HTML (possible client-render bailout)");
console.log("PASS homepage returns 200 and includes an H1 in initial HTML");

const invalidSlug = `soft-404-regression-${Date.now().toString(36)}`;
const missing = await request(`/tools/${invalidSlug}`);
const missingHtml = await missing.text();
assert(
  missing.status === 404,
  `Unknown tool slug expected HTTP 404, received ${missing.status}`,
);
assert(
  /That tool isn't listed|404\s*[·-]\s*Not found/i.test(missingHtml),
  "404 response did not contain the expected not-found page",
);
console.log("PASS unknown tool slug returns HTTP 404 with the not-found page");

const validSlug = process.env.PROTHER_VALID_TOOL_SLUG?.trim();
if (validSlug) {
  const valid = await request(`/tools/${encodeURIComponent(validSlug)}`);
  const validHtml = await valid.text();
  assert(
    valid.status === 200,
    `Known tool "${validSlug}" expected HTTP 200, received ${valid.status}`,
  );
  assert(/<h1\b/i.test(validHtml), `Known tool "${validSlug}" is missing an H1 in initial HTML`);
  assert(
    !validHtml.includes("NEXT_HTTP_ERROR_FALLBACK;404"),
    `Known tool "${validSlug}" unexpectedly rendered the Next.js 404 digest`,
  );
  console.log(`PASS known tool "${validSlug}" returns 200 and server-rendered content`);
} else {
  console.log("SKIP valid-tool check (set PROTHER_VALID_TOOL_SLUG to enable)");
}
