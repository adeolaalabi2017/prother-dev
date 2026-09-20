/**
 * Minimal, dependency-free Markdown → HTML renderer for Journal posts.
 *
 * Supports the subset used by the editorial team: h2/h3, **bold**, *italic*,
 * `code`, fenced blocks, - / 1. lists, > quotes, links, --- rules, and
 * paragraphs. All input is HTML-escaped FIRST, so admin-authored content can
 * never inject markup. Output is injected into the reader via
 * dangerouslySetInnerHTML with .post-body scoping in globals.css.
 */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Inline: code, bold, italic, links (escape already applied). */
function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+|#[^\s)]*|\/[^\s)]*)\)/g,
      '<a href="$2" rel="noopener noreferrer">$1</a>'
    );
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence
      out.push(
        `<pre class="md-pre"${lang ? ` data-lang="${esc(lang)}"` : ""}><code>${esc(
          buf.join("\n")
        )}</code></pre>`
      );
      continue;
    }

    // headings
    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${inline(esc(h[2].trim()))}</h${level}>`);
      i++;
      continue;
    }

    // hr
    if (/^---+\s*$/.test(line)) {
      out.push('<hr class="md-hr" />');
      i++;
      continue;
    }

    // blockquote
    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        buf.push(lines[i].slice(2));
        i++;
      }
      out.push(
        `<blockquote class="md-quote">${inline(esc(buf.join(" ")))}</blockquote>`
      );
      continue;
    }

    // unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inline(esc(lines[i].replace(/^[-*]\s+/, "")))}</li>`);
        i++;
      }
      out.push(`<ul class="md-list">${items.join("")}</ul>`);
      continue;
    }

    // ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${inline(esc(lines[i].replace(/^\d+\.\s+/, "")))}</li>`);
        i++;
      }
      out.push(`<ol class="md-list">${items.join("")}</ol>`);
      continue;
    }

    // blank
    if (line.trim() === "") {
      i++;
      continue;
    }

    // paragraph — merge consecutive non-special lines
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{2,4})\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].startsWith("> ") &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(esc(para.join(" ")))}</p>`);
  }

  return out.join("\n");
}
