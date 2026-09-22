/**
 * Lightweight token matching shared by the hero-search dropdown
 * (/api/search) and the SERP (lib/search) so both surfaces agree on what
 * a query means.
 *
 * Rules:
 * - The query is lowercased and split into alphanumeric tokens (+#. are
 *   kept inside tokens so "c++", "node.js", "next.js" survive).
 * - EVERY token must hit at least one searchable field (AND semantics):
 *   "translate video" finds tools that do both, not tools that mention
 *   just one of the words.
 * - Each token gets a cheap plural/gerund stem ("videos" → "video") so
 *   common word forms still meet.
 */

export function tokenize(q: string): string[] {
  return Array.from(
    new Set(
      q
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .filter((t) => t.length > 0)
    )
  );
}

/** Strip one trailing s/es/ed/ing — small directory, precision over linguistics. */
export function stem(token: string): string {
  if (token.length < 5) return token;
  const stripped = token.replace(/(ing|ed|es|s)$/, "");
  return stripped.length >= 3 ? stripped : token;
}

function hitsField(token: string, field: string | null | undefined): boolean {
  if (!field) return false;
  const f = field.toLowerCase();
  if (f.includes(token)) return true;
  const s = stem(token);
  return s !== token && f.includes(s);
}

/**
 * True when every token matches at least one of the given fields.
 * An empty token list never matches (callers treat that as "no query").
 */
export function matchTokens(
  fields: (string | null | undefined)[],
  tokens: string[]
): boolean {
  if (tokens.length === 0) return false;
  return tokens.every((tok) => fields.some((f) => hitsField(tok, f)));
}

/** Field weights — name hits outrank tagline hits outrank tags/description. */
function scoreVariant(
  v: string,
  name: string,
  tagline: string,
  tags: string,
  description: string | null
): number {
  if (name.startsWith(v)) return 100;
  if (name.includes(v)) return 80;
  if (tagline.includes(v)) return 55;
  if (tags.includes(v)) return 40;
  if ((description ?? "").includes(v)) return 25;
  return 0;
}

/**
 * Summed per-token relevance for an already-matching candidate. Every
 * token contributes its best field score (floor 10), so multi-word
 * queries rank tools that satisfy more of the query higher.
 */
export function relevanceScore(
  tokens: string[],
  fields: { name: string; tagline: string; tags: string; description: string | null }
): number {
  const n = fields.name.toLowerCase();
  const tg = fields.tagline.toLowerCase();
  const tgs = fields.tags.toLowerCase();
  const d = (fields.description ?? "").toLowerCase();
  let sum = 0;
  for (const tok of tokens) {
    const s = stem(tok);
    const score = Math.max(
      scoreVariant(tok, n, tg, tgs, d),
      s !== tok ? scoreVariant(s, n, tg, tgs, d) : 0
    );
    sum += score > 0 ? score : 10;
  }
  return sum;
}
