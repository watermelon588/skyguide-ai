// ============================================================================
//  BRAND — the single source of truth for the SkyGuide identity.
//
//  ►► TO CHANGE THE LOGO EVERYWHERE, EDIT THE ONE IMPORT LINE BELOW. ◄◄
//
//  That one line drives every logo in the app: the navbar, the landing nav and
//  its mobile sheet, the footer, the auth screens, public profiles, the phone
//  companion, and the browser tab favicon.
//
//  Two consumers live outside the JS bundle and can't read this file at
//  runtime — the installed-PWA icon (public/companion.webmanifest) and the
//  iOS home-screen icon. A tiny script copies the chosen file out to
//  public/brand/logo.png for them:
//
//      npm run sync:brand        (from frontend/ — reads the import below)
//
//  So the full change is: edit the import → run `npm run sync:brand`.
//  Skipping the script only leaves the *installed app* icon stale; everything
//  inside the app, including the favicon, follows the import immediately.
// ============================================================================

import logoSrc from "../assets/logo/logo4.png";

/** The brand mark. Square, transparent corners, reads on the black canvas. */
export const LOGO_SRC = logoSrc;

/** Wordmark, split so the accent half stays a token and not a hardcoded color. */
export const BRAND_NAME = "SkyGuide";
export const BRAND_ACCENT_WORD = "AI";

/** "SkyGuide AI" — for alt text, titles, and anywhere plain text is needed. */
export const BRAND_FULL_NAME = `${BRAND_NAME} ${BRAND_ACCENT_WORD}`;

/**
 * Point the browser tab at the brand mark, from this same single source.
 *
 * Done at runtime (rather than only in the HTML) so the favicon follows the
 * import above with no build step — swap logo5 for logo7 and the tab changes
 * too. The static <link> in the HTML is the pre-JS placeholder; this replaces
 * it once the app boots.
 */
export function applyBrandFavicon() {
  if (typeof document === "undefined") return;
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = LOGO_SRC;
}
