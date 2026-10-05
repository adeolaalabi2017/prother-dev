/**
 * Safely serialize a JSON-LD object for embedding in a <script> tag.
 *
 * JSON.stringify alone can produce literal "</script>" sequences when
 * user-controlled strings contain that pattern, allowing an attacker
 * to break out of the JSON-LD script block and inject arbitrary HTML.
 *
 * This helper replaces every `<` with its Unicode escape `\u003c`,
 * which is semantically identical in JSON but prevents the HTML parser
 * from seeing a closing tag.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
