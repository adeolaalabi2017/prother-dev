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
    .replace(
      /!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,
      '<img src="$2" alt="$1" class="md-img my-6 rounded-xl border border-white/10 w-full" loading="lazy" />'
    )
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

    // fenced code block or carousel
    if (line.trim().startsWith("```") || line.trim().startsWith(":::carousel")) {
      const isColonBlock = line.trim().startsWith(":::carousel");
      const lang = isColonBlock ? "carousel" : line.trim().replace(/^`+/, "").trim();
      const endMarker = isColonBlock ? ":::" : "```";
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(endMarker)) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence

      if (lang === "carousel") {
        const content = buf.join("\n");
        const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;
        let match: RegExpExecArray | null;
        const slides: { alt: string; src: string }[] = [];
        while ((match = imgRegex.exec(content)) !== null) {
          slides.push({ alt: match[1], src: match[2] });
        }
        if (slides.length > 0) {
          let carouselHtml = '<div class="md-carousel-container my-8 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6 overflow-hidden">';
          carouselHtml += '<div class="md-carousel-header mb-4 flex items-center justify-between gap-3">';
          carouselHtml += '<div class="flex items-center gap-2">';
          carouselHtml += '<span class="inline-block size-2 rounded-full bg-ember animate-pulse"></span>';
          carouselHtml += '<span class="font-mono text-xs uppercase tracking-wider text-ember-tint font-bold">Model Benchmarks &amp; Visuals Carousel</span>';
          carouselHtml += '</div>';
          carouselHtml += '<div class="flex items-center gap-2">';
          carouselHtml += '<button type="button" class="md-carousel-btn md-carousel-prev rounded-lg border border-white/15 px-2.5 py-1 text-xs font-mono text-white/80 transition-colors hover:border-ember hover:text-ember cursor-pointer" onclick="this.closest(\'.md-carousel-container\').querySelector(\'.md-carousel-track\').scrollBy({left: -420, behavior: \'smooth\'})" aria-label="Previous slide">← Prev</button>';
          carouselHtml += '<button type="button" class="md-carousel-btn md-carousel-next rounded-lg border border-white/15 px-2.5 py-1 text-xs font-mono text-white/80 transition-colors hover:border-ember hover:text-ember cursor-pointer" onclick="this.closest(\'.md-carousel-container\').querySelector(\'.md-carousel-track\').scrollBy({left: 420, behavior: \'smooth\'})" aria-label="Next slide">Next →</button>';
          carouselHtml += '</div>';
          carouselHtml += '</div>';
          carouselHtml += '<div class="md-carousel-track flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 pt-1 scroll-smooth no-scrollbar">';
          for (const s of slides) {
            carouselHtml += '<div class="md-carousel-slide min-w-[85%] sm:min-w-[70%] md:min-w-[60%] snap-center shrink-0 flex flex-col justify-between rounded-xl border border-white/10 bg-black/40 p-3 shadow-xl">';
            carouselHtml += '<div class="overflow-hidden rounded-lg bg-black/60 flex items-center justify-center">';
            carouselHtml += `<img src="${esc(s.src)}" alt="${esc(s.alt)}" class="w-full h-auto max-h-[460px] object-contain rounded-lg" loading="lazy" />`;
            carouselHtml += '</div>';
            if (s.alt) {
              carouselHtml += `<p class="mt-3 text-center font-mono text-xs text-white/80 font-medium">${inline(esc(s.alt))}</p>`;
            }
            carouselHtml += '</div>';
          }
          carouselHtml += '</div>';
          carouselHtml += `<div class="mt-2 text-right font-mono text-[11px] text-white/40 tracking-wider">Swipe or click arrows to view all ${slides.length} slides</div>`;
          carouselHtml += '</div>';
          out.push(carouselHtml);
          continue;
        }
      }

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

    // table
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const headerCols = tableLines[0].split("|").slice(1, -1).map((c) => c.trim());
        const isSeparator = /^\|[\s\-:]+(\|[\s\-:]+)+\|$/.test(tableLines[1]);
        const bodyStart = isSeparator ? 2 : 1;

        let tableHtml = '<div class="md-table-wrap my-6 overflow-x-auto rounded-xl border border-white/10"><table class="w-full text-left text-sm border-collapse">';
        tableHtml += '<thead class="bg-white/5 border-b border-white/10"><tr>';
        for (const col of headerCols) {
          tableHtml += `<th class="px-4 py-3 font-mono text-xs uppercase tracking-wider text-ember-tint">${inline(esc(col))}</th>`;
        }
        tableHtml += '</tr></thead><tbody>';
        for (let r = bodyStart; r < tableLines.length; r++) {
          const cells = tableLines[r].split("|").slice(1, -1).map((c) => c.trim());
          tableHtml += '<tr class="border-b border-white/5 hover:bg-white/[0.02] transition-colors">';
          for (const cell of cells) {
            tableHtml += `<td class="px-4 py-3 align-top text-white/80">${inline(esc(cell))}</td>`;
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table></div>';
        out.push(tableHtml);
        continue;
      }
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
      !lines[i].trim().startsWith(":::carousel") &&
      !lines[i].startsWith("> ") &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i]) &&
      !(lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|"))
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(esc(para.join(" ")))}</p>`);
  }

  return out.join("\n");
}
