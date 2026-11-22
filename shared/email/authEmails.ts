import { escapeHtml, type RenderedEmail } from "./orderEmail";

function layout(
  title: string,
  intro: string,
  cta: string,
  url: string,
  outro: string,
): RenderedEmail {
  const e = escapeHtml;
  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<div style="max-width:520px;margin:0 auto;padding:24px 16px"><div style="background:#fff;border-radius:12px;padding:24px">
<h1 style="margin:0 0 12px;font-size:20px">${e(title)}</h1>
<p style="margin:0 0 20px;font-size:14px;line-height:1.5">${e(intro)}</p>
<p style="margin:0 0 20px"><a href="${e(url)}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">${e(cta)}</a></p>
<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5">${e(outro)}</p>
</div><p style="margin:16px 0 0;text-align:center;color:#9ca3af;font-size:12px">CampusCart — Your Campus. Your Marketplace.</p></div></body></html>`;
  return { subject: title, html, text: `${title}\n\n${intro}\n\n${cta}: ${url}\n\n${outro}` };
}

export const renderPasswordResetEmail = (url: string) =>
  layout(
    "Reset your CampusCart password",
    "We received a request to reset your password. The link is valid for one hour.",
    "Choose a new password",
    url,
    "If you didn't ask for this, you can ignore this e-mail — your password stays the same.",
  );

export const renderVerifyEmail = (url: string) =>
  layout(
    "Confirm your CampusCart e-mail",
    "Confirm your e-mail address to finish setting up your CampusCart account.",
    "Confirm e-mail",
    url,
    "If you didn't create a CampusCart account, you can ignore this e-mail.",
  );
