import { STANDARD_DEFS } from "@/lib/standards";
import {
  FONT,
  button,
  closing,
  esc,
  heading,
  inset,
  lead,
  link,
  originParts,
  renderLayout,
  small,
  strong,
  type RenderedEmail,
} from "@/lib/email/layout";

/**
 * Maker-facing review decisions, sent from /api/editor/decision after the
 * decision is saved. Shell and brand rules live in ./layout.ts.
 */

/** Inbox that replies and appeals reach (also set as Reply-To on send). */
export const MAKERS_INBOX = "makers@prother.dev";

export function renderApprovalEmail({
  toolName,
  slug,
  origin,
}: {
  toolName: string;
  slug: string;
  origin?: string;
}): RenderedEmail {
  const { base } = originParts(origin);
  const listing = `${base}/tools/${encodeURIComponent(slug)}`;
  const subject = `${toolName} is live on Prother`;

  const body = [
    heading(`${toolName} is live`),
    lead(
      `An editor checked ${strong(toolName)} against all six Prother standards and it passed. The listing is in the directory now.`
    ),
    button(listing, "View your listing"),
    inset([
      { label: "Status", value: "Approved and live" },
      { label: "Standards", value: "Passed all six (S1 to S6)" },
    ]),
    closing(
      `Something wrong on the listing? Reply to this email or write to ${link(`mailto:${MAKERS_INBOX}`, MAKERS_INBOX)}.`
    ),
  ].join("\n            ");

  const html = renderLayout({
    title: subject,
    preheader: `${toolName} passed review and is now listed on Prother.`,
    body,
    origin,
  });

  const text = [
    `${toolName} is live`,
    "",
    `An editor checked ${toolName} against all six Prother standards and it passed. The listing is in the directory now.`,
    "",
    `View your listing: ${listing}`,
    "",
    `Something wrong on the listing? Reply to this email or write to ${MAKERS_INBOX}.`,
    "",
    `Prother: the curated directory for AI tools. ${base}`,
  ].join("\n");

  return { subject, html, text };
}

/** One failed standard as a row: id badge, title, and plain-English meaning. */
function standardRow(id: string, title: string, blurb: string, last: boolean): string {
  return `<tr>
                <td style="padding:14px 0;${last ? "" : "border-bottom:1px solid #ece8df;"}vertical-align:top;width:44px;" class="p-rule">
                  <span class="p-inset p-ink" style="display:inline-block;padding:3px 9px;border-radius:999px;background-color:#f1eee7;font-family:${FONT};font-size:12px;font-weight:600;line-height:1.3;color:#141312;">${esc(id)}</span>
                </td>
                <td style="padding:14px 0 14px 12px;${last ? "" : "border-bottom:1px solid #ece8df;"}vertical-align:top;font-family:${FONT};" class="p-rule">
                  <span class="p-ink" style="color:#141312;font-size:15px;font-weight:600;line-height:1.4;">${esc(title)}</span><br>
                  <span class="p-muted" style="color:#6b665e;font-size:14px;line-height:1.5;">${esc(blurb)}</span>
                </td>
              </tr>`;
}

export function renderRejectionEmail({
  toolName,
  failedStandards,
  note,
  origin,
}: {
  toolName: string;
  failedStandards: ReadonlyArray<string>;
  note?: string;
  origin?: string;
}): RenderedEmail {
  const { base } = originParts(origin);
  const submit = `${base}/submit`;
  const failed = STANDARD_DEFS.filter((s) => failedStandards.includes(s.id));
  const count = failed.length === 1 ? "one standard" : `${failed.length} standards`;
  const subject = `${toolName} wasn't listed on Prother`;
  const editorNote = (note ?? "").trim();

  const rows = failed
    .map((s, i) => standardRow(s.id, s.title, s.blurb, i === failed.length - 1))
    .join("\n");

  const body = [
    heading(`${toolName} wasn't listed this time`),
    lead(
      `An editor reviewed ${strong(toolName)} and it missed ${esc(count)}. Here is what didn't pass.`,
      12
    ),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
              ${rows}
            </table>`,
    editorNote ? inset([{ label: "Editor's note", value: editorNote }]) : "",
    editorNote ? `<div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>` : "",
    lead(
      esc("Fix what's listed above, then submit the tool again. Every resubmission gets a fresh review."),
      24
    ),
    button(submit, "Resubmit your tool"),
    small(
      `You can check the status of any submission on ${link(submit, `${originParts(origin).host}/submit`)}.`,
      0
    ),
    closing(
      `Think we got it wrong? Reply to this email or write to ${link(`mailto:${MAKERS_INBOX}`, MAKERS_INBOX)} with the details and an editor will take another look.`
    ),
  ]
    .filter(Boolean)
    .join("\n            ");

  const html = renderLayout({
    title: subject,
    preheader: `${toolName} missed ${count}: ${failed.map((s) => s.id).join(", ")}. Here's how to fix it.`,
    body,
    origin,
  });

  const text = [
    `${toolName} wasn't listed this time`,
    "",
    `An editor reviewed ${toolName} and it missed ${count}. Here is what didn't pass:`,
    "",
    ...failed.map((s) => `- ${s.id} ${s.title}: ${s.blurb}`),
    ...(editorNote ? ["", `Editor's note: ${editorNote}`] : []),
    "",
    "Fix what's listed above, then submit the tool again. Every resubmission gets a fresh review.",
    "",
    `Resubmit or check your status: ${submit}`,
    "",
    `Think we got it wrong? Reply to this email or write to ${MAKERS_INBOX} with the details and an editor will take another look.`,
    "",
    `Prother: the curated directory for AI tools. ${base}`,
  ].join("\n");

  return { subject, html, text };
}
