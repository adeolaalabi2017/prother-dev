import { siteUrl } from "@/lib/site-url";

/**
 * Shared shell for every Prother transactional email (sign-in, approval,
 * rejection). Email clients ignore <style> unevenly, so every rule that
 * matters is inline and the layout is table-based. The <style> block only
 * adds a dark palette for clients that honour prefers-color-scheme (Apple
 * Mail, iOS Mail); everywhere else gets the light design.
 *
 * Brand: coal ink (#141312), ember fill (#ff6a00) with a dark label (the
 * site's own button treatment), AA-safe ember text (#b03a00) for links on
 * white, and the official Prother mark served from /email/prother-mark.png.
 */

export type RenderedEmail = { subject: string; html: string; text: string };

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
export const MONO =
  "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

/** Normalised origin pieces: `base` has no trailing slash, `host` no scheme. */
export function originParts(origin: string = siteUrl()) {
  const base = origin.replace(/\/+$/, "");
  return { base, host: base.replace(/^https?:\/\//, "") };
}

/** Big quiet headline. `text` is escaped. */
export function heading(text: string): string {
  return `<h1 class="p-ink p-h1" style="margin:0 0 12px 0;font-family:${FONT};font-size:30px;line-height:1.15;font-weight:500;letter-spacing:-0.6px;color:#141312;">${esc(text)}</h1>`;
}

/** Muted lead paragraph. `html` must already be escaped. */
export function lead(html: string, marginBottom = 28): string {
  return `<p class="p-muted" style="margin:0 0 ${marginBottom}px 0;font-family:${FONT};font-size:16px;line-height:1.55;color:#6b665e;">${html}</p>`;
}

/** Full-strength inline emphasis inside a muted paragraph. `text` is escaped. */
export function strong(text: string): string {
  return `<span class="p-ink" style="color:#141312;font-weight:600;">${esc(text)}</span>`;
}

/** The single ember primary action. */
export function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
              <tr>
                <td align="center" bgcolor="#ff6a00" style="border-radius:12px;background-color:#ff6a00;">
                  <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:16px;font-weight:600;line-height:1;color:#141312;text-decoration:none;border-radius:12px;">${esc(label)}</a>
                </td>
              </tr>
            </table>`;
}

/** Inset panel of label-value rows. Labels and values are escaped. */
export function inset(rows: ReadonlyArray<{ label: string; value: string }>): string {
  const cells = rows
    .map((r, i) => {
      const top = i === 0 ? 14 : 8;
      const bottom = i === rows.length - 1 ? 14 : 6;
      return `<tr>
                <td style="padding:${top}px 18px ${bottom}px 18px;font-family:${FONT};font-size:13px;line-height:1.4;">
                  <span class="p-muted" style="color:#6b665e;">${esc(r.label)}</span><br>
                  <span class="p-ink" style="color:#141312;font-size:15px;">${esc(r.value)}</span>
                </td>
              </tr>`;
    })
    .join("\n");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="p-inset" style="background-color:#f7f5f0;border-radius:12px;">
              ${cells}
            </table>`;
}

/** Small muted paragraph. `html` must already be escaped. */
export function small(html: string, marginTop = 28): string {
  return `<p class="p-muted" style="margin:${marginTop}px 0 6px 0;font-family:${FONT};font-size:13px;line-height:1.5;color:#6b665e;">${html}</p>`;
}

/** Monospace fallback link that wraps anywhere. */
export function fallbackLink(href: string): string {
  const h = esc(href);
  return `<p style="margin:0;font-family:${MONO};font-size:12px;line-height:1.55;word-break:break-all;"><a href="${h}" target="_blank" class="p-link" style="color:#b03a00;text-decoration:underline;">${h}</a></p>`;
}

/** Hairline-separated closing note. `html` must already be escaped. */
export function closing(html: string): string {
  return `<p class="p-muted p-rule" style="margin:28px 0 0 0;padding-top:20px;border-top:1px solid #ece8df;font-family:${FONT};font-size:13px;line-height:1.5;color:#6b665e;">${html}</p>`;
}

/** Inline ember link. */
export function link(href: string, label: string): string {
  return `<a href="${esc(href)}" target="_blank" class="p-link" style="color:#b03a00;text-decoration:underline;">${esc(label)}</a>`;
}

export function renderLayout({
  title,
  preheader,
  body,
  origin,
}: {
  title: string;
  preheader: string;
  /** Card contents, built from the helpers above. */
  body: string;
  origin?: string;
}): string {
  const { base, host } = originParts(origin);
  const logo = `${base}/email/prother-mark.png`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(title)}</title>
<style>
  @media (prefers-color-scheme: dark) {
    .p-page { background-color: #0e0d0c !important; }
    .p-card { background-color: #141312 !important; border-color: #2a2825 !important; }
    .p-inset { background-color: #1c1b19 !important; }
    .p-ink { color: #f4f2ec !important; }
    .p-muted { color: #a39e96 !important; }
    .p-link { color: #ff8a3d !important; }
    .p-rule { border-color: #2a2825 !important; }
  }
  @media (max-width: 520px) {
    .p-pad { padding-left: 24px !important; padding-right: 24px !important; }
    .p-h1 { font-size: 26px !important; }
  }
</style>
</head>
<body class="p-page" style="margin:0;padding:0;background-color:#f4f2ec;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="p-page" style="background-color:#f4f2ec;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
        <tr>
          <td style="padding:0 4px 20px 4px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;padding-right:12px;">
                  <img src="${esc(logo)}" width="40" height="40" alt="Prother" style="display:block;width:40px;height:40px;border:0;border-radius:9px;">
                </td>
                <td class="p-ink" style="vertical-align:middle;font-family:${FONT};font-size:19px;font-weight:600;letter-spacing:-0.2px;color:#141312;">Prother</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="p-card p-pad" style="background-color:#ffffff;border:1px solid #e7e3da;border-radius:20px;padding:40px 40px 32px 40px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 4px 0 4px;font-family:${FONT};font-size:12px;line-height:1.5;">
            <span class="p-muted" style="color:#6b665e;">Prother: the curated directory for AI tools.</span>
            <a href="${esc(base)}" target="_blank" class="p-link" style="color:#b03a00;text-decoration:none;">${esc(host)}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
