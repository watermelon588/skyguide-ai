/**
 * Network configuration layer (gateway).
 *
 * Single source for the gateway's client-facing URLs and bind host. Switching
 * between local / LAN / Cloudflare is a pure env change (`NETWORK_MODE`) — no
 * code edits.
 *
 * CORS deliberately allows EVERY configured origin (not just the active mode):
 * during a paired session the desktop dashboard may sit on localhost while the
 * phone reaches the gateway over the LAN IP or tunnel, so both must be allowed
 * at once. Never a wildcard — credentials require explicit origins.
 *
 * Modes: "local" | "lan" | "tunnel" | "production" (future)
 */

const MODE = (process.env.NETWORK_MODE || "local").toLowerCase();

const LOCAL_CLIENT = process.env.LOCAL_CLIENT_URL || "http://localhost:5173";
const LAN_CLIENT = process.env.LAN_CLIENT_URL || "";
const TUNNEL_CLIENT = process.env.TUNNEL_CLIENT_URL || "";

// Legacy / extra origins (comma-separated) kept for backward compatibility.
const EXTRA_ORIGINS = (process.env.CLIENT_URL || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

function pick(local, lan, tunnel) {
    switch (MODE) {
        case "lan":
            return lan || local;
        case "tunnel":
        case "production":
            return tunnel || local;
        default:
            return local;
    }
}

/** The client (web app) URL for the active mode. */
function getClientUrl() {
    return pick(LOCAL_CLIENT, LAN_CLIENT, TUNNEL_CLIENT);
}

/** Every allow-listed browser origin, across all modes. Deduped, no wildcard. */
function getAllowedOrigins() {
    const all = [LOCAL_CLIENT, LAN_CLIENT, TUNNEL_CLIENT, ...EXTRA_ORIGINS].filter(
        Boolean
    );
    return [...new Set(all)];
}

/** Bind host — 0.0.0.0 so LAN devices and tunnels can reach the gateway. */
function getHost() {
    return process.env.HOST || "0.0.0.0";
}

/**
 * Is the browser reaching us over HTTPS?
 *
 * Drives the session cookie's `secure` / `sameSite:"none"` pair. Getting this
 * wrong is silent and total: `secure` on plain HTTP means the browser discards
 * the cookie and nobody can stay signed in, while missing it over a tunnel
 * means `sameSite:"none"` is rejected and cross-site pairing breaks.
 *
 * Both cloudflared modes terminate TLS at Cloudflare's edge and forward plain
 * HTTP to this process, so the local socket is NEVER https — the mode is the
 * only honest signal here, which is why this reads config rather than req.
 */
function isHttps() {
    if (process.env.NODE_ENV === "production") return true;
    if (MODE === "tunnel" || MODE === "production") return true;
    // Explicit override for a reverse proxy that isn't described by MODE.
    return process.env.FORCE_SECURE_COOKIES === "true";
}

/**
 * Is a reverse proxy (Cloudflare Tunnel, CDN, load balancer) in front of us?
 *
 * Controls Express's `trust proxy`. This is deliberately NOT always-on:
 *
 *   behind a proxy, OFF -> every request appears to come from the tunnel
 *                          connector (127.0.0.1), so the whole internet shares
 *                          ONE rate-limit bucket and a single attacker can lock
 *                          every user out.
 *   NOT behind one, ON  -> `X-Forwarded-For` is client-controlled, so anyone
 *                          can forge a fresh IP per request and rate limits
 *                          become decorative.
 *
 * Neither failure is visible in normal use, so it must follow the deployment
 * shape rather than defaulting either way.
 */
function isBehindProxy() {
    if (process.env.TRUST_PROXY === "true") return true;
    if (process.env.TRUST_PROXY === "false") return false;
    return MODE === "tunnel" || MODE === "production";
}

/**
 * Value for `app.set("trust proxy", ...)`.
 *
 * A hop COUNT, never `true`. `true` trusts the leftmost X-Forwarded-For entry,
 * which is the one the client writes — express-rate-limit rejects it outright
 * for that reason. cloudflared appends the real client IP as the last hop, so
 * counting one hop back from the socket yields an address the client cannot
 * forge. Override with TRUST_PROXY_HOPS when stacking another proxy in front.
 */
function getTrustProxy() {
    if (!isBehindProxy()) return false;
    const hops = Number.parseInt(process.env.TRUST_PROXY_HOPS ?? "", 10);
    return Number.isInteger(hops) && hops > 0 ? hops : 1;
}

function getNetworkMode() {
    return MODE;
}

/** Startup banner describing the resolved network. */
function logNetworkConfig(port) {
    const origins = getAllowedOrigins();
    console.log("──────────────────────────────────────────────");
    console.log(`🌐 Network Mode : ${MODE.toUpperCase()}`);
    console.log(`   Client URL   : ${getClientUrl()}`);
    console.log(`   Bind Host    : ${getHost()}:${port}`);
    console.log(`   CORS Origins : ${origins.join(", ") || "(none configured)"}`);
    console.log(
        `   Secure Cookies: ${isHttps() ? "yes (secure + sameSite=none)" : "no (lax, plain HTTP)"}`
    );
    console.log(
        `   Trust Proxy  : ${getTrustProxy() === false ? "off (direct)" : `${getTrustProxy()} hop(s)`}`
    );
    console.log("──────────────────────────────────────────────");
}

module.exports = {
    getNetworkMode,
    getClientUrl,
    getAllowedOrigins,
    getHost,
    isHttps,
    isBehindProxy,
    getTrustProxy,
    logNetworkConfig,
};
