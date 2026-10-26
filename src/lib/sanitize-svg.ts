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
 * Helper to check if a URI value has a dangerous scheme (javascript:, vbscript:,
 * or executable data: like data:text/html, data:image/svg+xml).
 * Handles XML numeric entities (&#x6a;, &#106;) and whitespace evasion (&Tab;, spaces).
 */
function isDangerousUri(raw: string): boolean {
  const decoded = raw
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
    .replace(/&Tab;|&NewLine;/gi, "")
    .replace(/[\0\x00-\x20\s]/g, "");

  if (/^(?:javascript|vbscript):/i.test(decoded)) return true;
  if (/^data:(?!image\/(?:png|jpeg|jpg|webp|gif);base64,)/i.test(decoded)) return true;
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
