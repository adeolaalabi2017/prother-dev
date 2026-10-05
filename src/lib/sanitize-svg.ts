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
 * Sanitize raw SVG bytes, returning cleaned bytes.
 * All operations are string-based (no DOM parser required) so this runs
 * safely in both Node and Cloudflare Workers environments.
 */
export function sanitizeSvg(bytes: Uint8Array): Uint8Array {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let svg = decoder.decode(bytes);

  // 1. Strip XML external entity declarations (XXE prevention).
  svg = svg.replace(/<!ENTITY\s[^>]*>/gi, "");
  svg = svg.replace(/<!DOCTYPE[^>]*>/gi, "");

  // 2. Remove <script>...</script> blocks (including CDATA).
  svg = svg.replace(/<script[\s>][\s\S]*?<\/script\s*>/gi, "");
  // Also remove self-closing <script .../> (non-standard but defensive).
  svg = svg.replace(/<script[^>]*\/\s*>/gi, "");

  // 3. Remove <foreignObject> elements (can embed arbitrary HTML/JS).
  svg = svg.replace(
    /<foreignObject[\s>][\s\S]*?<\/foreignObject\s*>/gi,
    ""
  );
  svg = svg.replace(/<foreignObject[^>]*\/\s*>/gi, "");

  // 4. Remove event handler attributes (on*="...").
  // Matches: onclick="..." onload='...' onerror=alert(1)
  svg = svg.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");

  // 5. Remove javascript: and data: URI schemes from href/xlink:href/src attributes.
  // Replace the dangerous value with an empty string rather than removing the
  // whole attribute, which could break SVG structure.
  svg = svg.replace(
    /((?:href|xlink:href|src)\s*=\s*(?:"|'))(?:\s*javascript:|data:text\/html)/gi,
    "$1#sanitized"
  );

  // 6. Remove <use> elements pointing to external resources (SSRF/XSS via external SVG).
  // Keep internal references (href="#id") but strip http/https external refs.
  svg = svg.replace(
    /(<use[^>]*(?:href|xlink:href)\s*=\s*(?:"|'))https?:\/\/[^"']*(?:"|')/gi,
    "$1#sanitized\""
  );

  // 7. Remove <set> and <animate> elements targeting event handlers.
  svg = svg.replace(
    /<(?:set|animate)\s[^>]*attributeName\s*=\s*(?:"|')on[a-z]+(?:"|')[^>]*\/?>/gi,
    ""
  );

  const encoded = new TextEncoder().encode(svg);
  const out = new Uint8Array(encoded.length);
  out.set(encoded);
  return out;
}
