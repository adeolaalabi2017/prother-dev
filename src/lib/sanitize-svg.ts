/**
 * SVG sanitizer - strips XSS vectors from uploaded SVG files.
 *
 * This is a conservative regex-based sanitizer that removes:
 * - <script> elements (and contents)
 * - Event handler attributes (onclick, onload, onerror, etc.)
 * - javascript: and data: URI schemes in attribute values
 * - <foreignObject> elements (can embed arbitrary HTML)
 * - XML external entity declarations (XXE)
 * - <use> elements referencing external resources
 *
 * For a production system with untrusted user uploads at scale, consider
 * replacing this with DOMPurify (server-side via jsdom) or @mdn/sanitizer.
 * This module is designed to be lightweight and Workers-compatible (no DOM).
 */

/**
 * Helper to decode HTML/XML entities (numeric, hex, and named entities like &colon;)
 * repeatedly to prevent nested entity obfuscation.
 */
function decodeAllEntities(str: string): string {
  let prev = "";
  let curr = str;
  let iterations = 0;
  while (curr !== prev && iterations < 3) {
    prev = curr;
    iterations++;
    curr = curr
      .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => {
        try {
          return String.fromCharCode(parseInt(hex, 16));
        } catch {
          return "";
        }
      })
      .replace(/&#([0-9]+);?/g, (_, dec) => {
        try {
          return String.fromCharCode(parseInt(dec, 10));
        } catch {
          return "";
        }
      })
      .replace(/&(?:colon);?/gi, ":")
      .replace(/&(?:tab|newline|space|semi);?/gi, "")
      .replace(/&(?:quot);?/gi, '"')
      .replace(/&(?:apos);?/gi, "'")
      .replace(/&(?:amp);?/gi, "&");
  }
  return curr;
}

/**
 * Helper to check if a URI value has a dangerous scheme (javascript:, vbscript:,
 * or executable data: like data:text/html, data:image/svg+xml).
 * Handles XML numeric entities (&#x6a;, &#106;), named entities (&colon;),
 * and whitespace evasion (&Tab;, spaces, control characters).
 */
function isDangerousUri(raw: string): boolean {
  const decoded = decodeAllEntities(raw);
  const cleaned = decoded
    .replace(/[\0-\x20\s\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase();

  if (/^(?:javascript|vbscript|file|filesystem):/i.test(cleaned)) return true;
  if (/^data:(?!image\/(?:png|jpeg|jpg|webp|gif);base64,)/i.test(cleaned)) return true;
  return false;
}

/**
 * Decodes CSS escapes (`\69`, `\000069 `, `\i`) and drops comments so
 * pattern checks see the same text the CSS parser does.
 */
function normalizeCss(raw: string): string {
  return decodeAllEntities(raw)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex) => {
      const cp = parseInt(hex, 16);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "";
    })
    .replace(/\\(.)/g, "$1")
    .toLowerCase();
}

/**
 * True when CSS (a <style> block or attribute value) can load an external
 * resource or execute script. Only same-document fragment refs
 * (`url(#gradient)`) are allowed through.
 */
function hasDangerousCss(raw: string): boolean {
  if (!/[@\\(:&]/.test(raw)) return false; // fast path for plain values
  const css = normalizeCss(raw);
  if (/@import|expression\s*\(|javascript\s*:|vbscript\s*:|-moz-binding|behavior\s*:/.test(css)) {
    return true;
  }
  for (const m of css.matchAll(/url\s*\(\s*(["']?)([^)]*?)\1\s*\)/g)) {
    if (!m[2]!.trim().startsWith("#")) return true;
  }
  // image-set()/src() fetch without url(): reject when given a string.
  if (/(?:image-set|-webkit-image-set|src)\s*\(\s*["']/.test(css)) return true;
  return false;
}

/**
 * Sanitize raw SVG bytes, returning cleaned bytes.
 * All operations are string-based (no DOM parser required) so this runs
 * safely in both Node and Cloudflare Workers environments.
 */
export function sanitizeSvg(bytes: Uint8Array): Uint8Array {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let svg = decoder.decode(bytes);

  // 1. Strip XML external entity declarations and DTDs (XXE prevention).
  svg = svg.replace(/<!ENTITY\s[^>]*>/gi, "");
  svg = svg.replace(/<!DOCTYPE[^>]*>/gi, "");

  // 2. Remove <script>...</script> blocks (including CDATA and self-closing).
  svg = svg.replace(/<script[\s>][\s\S]*?<\/script\s*>/gi, "");
  svg = svg.replace(/<script[^>]*\/\s*>/gi, "");

  // 3. Remove embedded active containers: <foreignObject>, <iframe>, <embed>, <object>.
  svg = svg.replace(
    /<(?:foreignObject|iframe|embed|object)[\s>][\s\S]*?<\/(?:foreignObject|iframe|embed|object)\s*>/gi,
    ""
  );
  svg = svg.replace(/<(?:foreignObject|iframe|embed|object)[^>]*\/\s*>/gi, "");

  // 3b. Remove <style> blocks that import or fetch anything, or run script.
  // The CSS is normalized first (comments stripped, CSS escapes and XML
  // entities decoded) so `@\69mport`, `url(//host)` and the like can't slip by.
  svg = svg.replace(/<style[\s>][\s\S]*?<\/style\s*>/gi, (match) =>
    hasDangerousCss(match) ? "" : match
  );
  svg = svg.replace(/<style[^>]*\/\s*>/gi, "");

  // 3c. Same check for inline `style="..."` and presentation attributes that
  // take url() (fill, stroke, filter, mask, clip-path, marker-*, cursor, ...).
  svg = svg.replace(
    /\s+([a-z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
    (match, name: string, q1, q2) =>
      // URI attributes are defanged (not dropped) by step 5 below.
      /^(?:href|xlink:href|src)$/i.test(name) || !hasDangerousCss(q1 ?? q2 ?? "")
        ? match
        : ""
  );

  // 4. Remove event handler attributes (on*="...", on*='...', on*=evil).
  svg = svg.replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");

  // 5. Defang dangerous URI schemes in href, xlink:href, and src attributes
  // Supports quoted and unquoted attributes, plus XML entities.
  svg = svg.replace(
    /((?:href|xlink:href|src)\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (match, prefix, q1, q2, unquoted) => {
      const val = q1 ?? q2 ?? unquoted ?? "";
      if (isDangerousUri(val)) {
        return `${prefix}"#sanitized"`;
      }
      return match;
    }
  );

  // 6. Remove <use> elements pointing to external resources or dangerous data URIs.
  svg = svg.replace(
    /<use[^>]*(?:href|xlink:href)\s*=\s*(?:"|')?(?:https?:\/\/|data:)[^"'>\s]*(?:"|')?[^>]*>/gi,
    ""
  );

  // 7. Remove <set> and <animate> elements targeting event handlers or URI attributes.
  svg = svg.replace(
    /<(?:set|animate|animateTransform)\s[^>]*attributeName\s*=\s*(?:"|')?(?:on[a-z0-9_-]+|href|xlink:href|src)(?:"|'|\s|>)[^>]*\/?>/gi,
    ""
  );

  const encoded = new TextEncoder().encode(svg);
  const out = new Uint8Array(encoded.length);
  out.set(encoded);
  return out;
}
