/**
 * Branded HTML email templates.
 *
 * Email clients are a hostile rendering target: no external CSS, patchy flexbox,
 * Outlook on Windows uses Word's engine. So everything here is table-based with
 * INLINE styles and web-safe fonts — no Satoshi (it won't load), no CSS grid.
 * The look still reads as SkyGuide: near-black canvas, electric-blue accent
 * (#0049CD / bright #1E63FF), hard 0-radius edges, hairline borders.
 *
 * Each template returns `{ subject, html, text }` — `text` is the plain-text
 * fallback the transport always attaches (see utils/email.js).
 */

const COLORS = {
  bg: "#000000",
  surface: "#0a0a0b",
  tile: "#111214",
  line: "#232427",
  accent: "#0049cd",
  accentHi: "#1e63ff",
  ink: "#f6f6f6",
  ink2: "#dadada",
  ink3: "#9d9d9c",
};

const APP_URL = () =>
  process.env.CLIENT_URL || process.env.FRONTEND_URL || "https://skyguide.app";

/**
 * The shared shell: centred 600px card on a black canvas, blue rule up top,
 * SkyGuide wordmark, {content}, then a muted footer. `preheader` is the grey
 * inbox-preview line (hidden in the body).
 */
function layout({ title, preheader, content, footNote }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COLORS.bg};font-size:1px;line-height:1px;">${preheader || ""}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.bg};padding:32px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:${COLORS.surface};border:1px solid ${COLORS.line};">
        <tr><td style="height:4px;background-color:${COLORS.accent};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:32px 40px 8px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <!-- The mark is served from the frontend origin (kept in sync
                     with the app's single brand source by "npm run sync:brand").
                     Most clients block images by default, so the wordmark beside
                     it — not the image — carries the identity. -->
                <td style="padding-right:10px;" valign="middle">
                  <img src="${APP_URL()}/brand/logo.png" width="28" height="28" alt=""
                    style="display:block;width:28px;height:28px;border:0;outline:none;">
                </td>
                <td valign="middle">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:800;letter-spacing:-0.5px;color:${COLORS.ink};text-transform:uppercase;">
                    SkyGuide <span style="color:${COLORS.accentHi};">AI</span>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 36px 40px;font-family:Arial,Helvetica,sans-serif;">
            ${content}
          </td>
        </tr>
        <tr><td style="height:1px;background-color:${COLORS.line};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:24px 40px;font-family:Arial,Helvetica,sans-serif;">
            <p style="margin:0;font-size:12px;line-height:18px;color:${COLORS.ink3};">
              ${footNote || "You're receiving this because you have a SkyGuide AI account."}
            </p>
            <p style="margin:12px 0 0 0;font-size:11px;color:${COLORS.ink3};">
              &copy; ${new Date().getFullYear()} SkyGuide AI &middot; Geometry by Astropy, Skyfield &amp; Astroquery
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** A filled electric-blue button (bulletproof — table cell, not an <a> block). */
function button(label, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;">
  <tr>
    <td style="background-color:${COLORS.accent};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:${COLORS.ink};text-decoration:none;text-transform:uppercase;letter-spacing:0.3px;">${label}</a>
    </td>
  </tr>
</table>`;
}

function heading(text) {
  return `<h1 style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.15;font-weight:800;letter-spacing:-0.5px;color:${COLORS.ink};text-transform:uppercase;">${text}</h1>`;
}

function paragraph(text) {
  return `<p style="margin:0 0 16px 0;font-size:15px;line-height:23px;color:${COLORS.ink2};">${text}</p>`;
}

/** A small feature row: blue tick + label + one line. */
function featureRow(titleText, bodyText) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 2px 0;">
  <tr>
    <td width="24" valign="top" style="padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${COLORS.accentHi};line-height:22px;">&#9679;</td>
    <td valign="top" style="padding:10px 0;border-bottom:1px solid ${COLORS.line};">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:${COLORS.ink};">${titleText}</p>
      <p style="margin:3px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:${COLORS.ink3};">${bodyText}</p>
    </td>
  </tr>
</table>`;
}

/**
 * Welcome email — sent once, right after sign-up. Warm, oriented, and it points
 * the new observer at the two things that make the product light up: setting a
 * location and opening tonight's sky.
 */
function welcomeEmail(user) {
  const name = user.displayName || user.username || "observer";
  const url = APP_URL();

  const content = `
    ${heading(`Welcome aboard, ${escapeHtml(name)}`)}
    ${paragraph(
      "Your account is ready. SkyGuide AI turns your location, your telescope and tonight's real sky into a ranked list of what's actually worth pointing at — and then guides your phone to it.",
    )}
    ${paragraph("Three things to try first:")}
    ${featureRow("Set your observing location", "Everything downstream — visibility, the Moon, alignment — is computed for your exact spot.")}
    ${featureRow("Open tonight's sky", "Meet your best targets for right now, each with a plain-English reason and its best window.")}
    ${featureRow("Pair your phone", "Scan a QR code, strap the phone to the tube, and follow live guidance until the target's centred.")}
    <div style="height:24px;font-size:0;line-height:0;">&nbsp;</div>
    ${button("Open your dashboard", `${url}/dashboard`)}
    <div style="height:8px;font-size:0;line-height:0;">&nbsp;</div>
    ${paragraph(
      `New to a telescope? The <a href="${url}/guide" target="_blank" style="color:${COLORS.accentHi};text-decoration:none;">First Light guide</a> walks you from sign-up to your first object in the eyepiece.`,
    )}
    ${paragraph("Clear skies,<br>— The SkyGuide AI team")}
  `;

  return {
    subject: "Welcome to SkyGuide AI — your sky is waiting",
    html: layout({
      title: "Welcome to SkyGuide AI",
      preheader: "Your account is ready — here's how to get to first light.",
      content,
      footNote:
        "You're receiving this because you just created a SkyGuide AI account.",
    }),
    text: welcomeText(name, url),
  };
}

function welcomeText(name, url) {
  return `Welcome aboard, ${name}!

Your SkyGuide AI account is ready. SkyGuide turns your location, your telescope
and tonight's real sky into a ranked list of what's worth observing — and guides
your phone to it.

Three things to try first:
  1. Set your observing location — everything is computed for your exact spot.
  2. Open tonight's sky — your best targets right now, with reasons and windows.
  3. Pair your phone — scan a QR code and follow live alignment guidance.

Open your dashboard: ${url}/dashboard
New to a telescope? The First Light guide: ${url}/guide

Clear skies,
— The SkyGuide AI team`;
}

/** Minimal HTML-escape for names/notes interpolated into templates. */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  layout,
  button,
  heading,
  paragraph,
  featureRow,
  welcomeEmail,
  escapeHtml,
  COLORS,
};
