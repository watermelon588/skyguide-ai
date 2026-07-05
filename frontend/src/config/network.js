/**
 * Network configuration layer (frontend).
 *
 * The single source of every externally-visible URL the app uses. Components
 * and services must NEVER hardcode `localhost`, a LAN IP, or a tunnel host —
 * they ask this module instead. Switching between local / LAN / Cloudflare is
 * therefore a pure environment change (`VITE_NETWORK_MODE`) with no code edits.
 *
 * Modes: "local" | "lan" | "tunnel" | "production" (future)
 *
 * Resolution is defensive: a mode whose URL is unset falls back to the local
 * URL, and finally to the browser's own origin — so a misconfigured demo still
 * degrades to "whatever host served this page" instead of a hard break.
 */

const env = import.meta.env;

/** Active network mode; defaults to local so nothing changes out of the box. */
export const NETWORK_MODE = (env.VITE_NETWORK_MODE || "local").toLowerCase();

const origin =
  typeof window !== "undefined" && window.location
    ? window.location.origin
    : "";

/**
 * Pick the URL for the active mode, degrading gracefully:
 *   requested mode's URL -> local URL -> browser origin.
 */
function pick(local, lan, tunnel) {
  const byMode = { local, lan, tunnel, production: tunnel };
  return byMode[NETWORK_MODE] || local || origin || "";
}

// --- Frontend (web app) URLs — used for QR pairing links + absolute links. ---
const FRONTEND = {
  local: env.VITE_LOCAL_FRONTEND_URL || origin || "http://localhost:5173",
  lan: env.VITE_LAN_FRONTEND_URL || "",
  tunnel: env.VITE_TUNNEL_FRONTEND_URL || "",
};

// --- Express gateway (REST + Socket.IO). Falls back to the legacy VITE_API_URL. ---
const legacyApi = env.VITE_API_URL || "http://localhost:5000";
const API = {
  local: env.VITE_API_LOCAL || legacyApi,
  lan: env.VITE_API_LAN || legacyApi,
  tunnel: env.VITE_API_TUNNEL || legacyApi,
};

// --- FastAPI Astro Engine (scientific data; not part of pairing). ---
const legacyAstro = env.VITE_ASTRO_URL || "http://localhost:8000";
const ASTRO = {
  local: env.VITE_ASTRO_LOCAL || legacyAstro,
  lan: env.VITE_ASTRO_LAN || legacyAstro,
  tunnel: env.VITE_ASTRO_TUNNEL || legacyAstro,
};

/** Web app base URL (QR codes, absolute links back to the dashboard). */
export function getFrontendBaseUrl() {
  return pick(FRONTEND.local, FRONTEND.lan, FRONTEND.tunnel);
}

/** Express gateway base URL (REST). */
export function getApiBaseUrl() {
  return pick(API.local, API.lan, API.tunnel);
}

/** Socket.IO base URL — Socket.IO is served by the Express gateway. */
export function getSocketBaseUrl() {
  return getApiBaseUrl();
}

/** Base URL encoded into pairing QR codes (the web app origin). */
export function getQrBaseUrl() {
  return getFrontendBaseUrl();
}

/** FastAPI Astro Engine base URL. */
export function getAstroBaseUrl() {
  return pick(ASTRO.local, ASTRO.lan, ASTRO.tunnel);
}

/** Snapshot of the resolved network — for the dev status panel and logging. */
export function getNetworkInfo() {
  return {
    mode: NETWORK_MODE,
    frontendUrl: getFrontendBaseUrl(),
    apiUrl: getApiBaseUrl(),
    socketUrl: getSocketBaseUrl(),
    qrUrl: getQrBaseUrl(),
    astroUrl: getAstroBaseUrl(),
    origin,
  };
}

// One-time startup log in development so the active mode is always obvious.
if (env.DEV) {
  const info = getNetworkInfo();
  // eslint-disable-next-line no-console
  console.info(
    `%c[SkyGuide] Network Mode: ${info.mode.toUpperCase()}`,
    "color:#FF8C1A;font-weight:bold",
    `\n  Frontend: ${info.frontendUrl}` +
      `\n  API:      ${info.apiUrl}` +
      `\n  Socket:   ${info.socketUrl}` +
      `\n  QR:       ${info.qrUrl}`,
  );
}
