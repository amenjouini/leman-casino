export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Replaces {{placeholders}}; unknown placeholders become empty strings. */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template
    .replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => vars[key.toLowerCase()] ?? "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const URL_RE = /(https?:\/\/[^\s<]+)/g;

/** Wraps plain-text content into a sober, branded, email-client-safe HTML layout. */
export function renderEmailHtml(opts: { title: string; body: string; casinoName: string; footer: string }): string {
  const paragraphs = escapeHtml(opts.body)
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, "<br>").replace(URL_RE, '<a href="$1" style="color:#9a7b3c">$1</a>'))
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6">${p}</p>`)
    .join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(opts.title)}</title></head>
<body style="margin:0;background:#f4f1ea;font-family:Helvetica,Arial,sans-serif;color:#1d2230">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden">
<tr><td style="background:#0d1424;padding:28px 32px;text-align:center">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:4px;color:#d9bf86">${escapeHtml(opts.casinoName.toUpperCase())}</div>
</td></tr>
<tr><td style="padding:32px;font-size:15px">${paragraphs}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #ece6d8;font-size:12px;color:#6b6f7b;line-height:1.5">${escapeHtml(opts.footer)}</td></tr>
</table></td></tr></table></body></html>`;
}
