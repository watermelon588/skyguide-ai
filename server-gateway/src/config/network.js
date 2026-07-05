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
    console.log("──────────────────────────────────────────────");
}

module.exports = {
    getNetworkMode,
    getClientUrl,
    getAllowedOrigins,
    getHost,
    logNetworkConfig,
};
