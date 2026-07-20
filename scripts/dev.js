/**
 * SkyGuide AI — development orchestrator.
 *
 *   npm run dev          → local  (localhost, no tunnels)
 *   npm run dev:lan      → lan    (192.168.x.x URLs from the .env files)
 *   npm run dev:tunnel   → tunnel (fully automated Cloudflare Quick Tunnels)
 *
 * One command starts the Astro Engine, the Express Gateway and the Vite
 * frontend together. In tunnel mode it first creates three Cloudflare Quick
 * Tunnels, captures the generated URLs, and injects them into every service
 * as process environment variables — the existing `network.js` layers resolve
 * them exactly as if they had come from `.env`, which is never modified.
 *
 * Tunnels are created BEFORE the services boot so Vite compiles the final
 * URLs on first start: generation happens once, nothing restarts mid-session.
 *
 * Zero npm dependencies — plain Node stdlib only.
 */

"use strict";

const path = require("path");
const log = require("./lib/logger");
const { assertCloudflaredInstalled, startQuickTunnel } = require("./lib/cloudflared");
const {
  startService,
  resolveAstroPython,
  killTree,
  assertPortsFree,
} = require("./lib/services");
const {
  writeRuntimeConfig,
  removeRuntimeConfig,
  readAstroCorsBase,
} = require("./lib/runtime");

const ROOT = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.join(ROOT, "frontend");
const GATEWAY_DIR = path.join(ROOT, "server-gateway");
const ASTRO_DIR = path.join(ROOT, "astro-engine");

const PORTS = { frontend: 5173, gateway: 5000, astro: 8000 };
const MODES = new Set(["local", "lan", "tunnel"]);

const mode = (process.argv[2] || "local").toLowerCase();

// --- Process registry + cleanup ------------------------------------------

/** Every child we spawn, so shutdown can never orphan a process. */
const children = [];
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info("Shutting down — stopping services and tunnels...");
  for (const child of children) killTree(child);
  removeRuntimeConfig(ROOT);
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
// Closing the terminal window on Windows delivers SIGHUP (not SIGINT).
// Without this, every child — Vite, uvicorn, nodemon, cloudflared — is
// orphaned, keeps its port, and the next run fails with "port in use"
// while stale tunnels serve a dead bundle.
process.on("SIGHUP", () => shutdown(0));
process.on("uncaughtException", (err) => {
  log.error(`Unexpected error: ${err.stack || err.message}`);
  shutdown(1);
});

function track(child) {
  children.push(child);
  return child;
}

// --- Tunnel pipeline -------------------------------------------------------

/**
 * Start all three Quick Tunnels concurrently and return their URLs.
 * Partial success is treated as failure: surviving tunnels are torn down and
 * every individual error is reported, so nothing fails silently.
 */
async function createTunnels() {
  log.info("Creating Cloudflare Quick Tunnels (frontend, backend, astro)...");

  // 127.0.0.1 (not "localhost") so cloudflared never dials the origin over
  // IPv6 loopback [::1], which drops connections on some Windows setups.
  const specs = [
    { key: "frontend", name: "frontend", targetUrl: `http://127.0.0.1:${PORTS.frontend}` },
    { key: "backend", name: "backend", targetUrl: `http://127.0.0.1:${PORTS.gateway}` },
    { key: "astro", name: "astro", targetUrl: `http://127.0.0.1:${PORTS.astro}` },
  ];

  const results = await Promise.allSettled(
    specs.map((spec) => startQuickTunnel(spec))
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    for (const r of results) {
      if (r.status === "fulfilled") killTree(r.value.proc);
    }
    const reasons = failures.map((f) => `  • ${f.reason.message}`).join("\n");
    throw new Error(
      `${failures.length} of ${specs.length} tunnels failed to start:\n${reasons}\n` +
        "  Quick Tunnels are a free, best-effort Cloudflare service — if this was a\n" +
        "  rate limit or outage, wait a minute and re-run `npm run dev:tunnel`.\n" +
        "  Local and LAN modes are unaffected (`npm run dev`, `npm run dev:lan`)."
    );
  }

  const urls = {};
  for (let i = 0; i < specs.length; i++) {
    const { proc, url } = results[i].value;
    urls[specs[i].key] = url;
    // A tunnel dying mid-session is not fatal (never interrupt a running dev
    // session), but the URL is unrecoverable — tell the developer loudly.
    proc.on("exit", (exitCode) => {
      if (shuttingDown) return;
      log.error(
        `The ${specs[i].name} tunnel exited unexpectedly (code ${exitCode}). ` +
          `Its URL is dead; restart \`npm run dev:tunnel\` to get fresh tunnels.`
      );
    });
    track(proc);
  }
  return urls;
}

// --- Service startup -------------------------------------------------------

/**
 * Start Astro Engine → Gateway → Frontend with per-mode env injection.
 * `tunnelUrls` is null outside tunnel mode.
 */
function startServices(tunnelUrls) {
  const frontendEnv = { VITE_NETWORK_MODE: mode };
  const gatewayEnv = { NETWORK_MODE: mode };
  const astroEnv = {};

  if (tunnelUrls) {
    // Frontend: QR + REST + Socket.IO + Astro all resolve through network.js.
    frontendEnv.VITE_TUNNEL_FRONTEND_URL = tunnelUrls.frontend;
    frontendEnv.VITE_API_TUNNEL = tunnelUrls.backend;
    frontendEnv.VITE_ASTRO_TUNNEL = tunnelUrls.astro;
    // Gateway: active client URL + CORS allow-list entry.
    gatewayEnv.TUNNEL_CLIENT_URL = tunnelUrls.frontend;
    // Astro Engine: the browser calls it cross-origin from the tunnel origin.
    astroEnv.CORS_ORIGINS = [
      readAstroCorsBase(ASTRO_DIR),
      tunnelUrls.frontend,
    ].join(",");
  }

  log.info("Starting Astro Engine (FastAPI :8000)...");
  track(
    startService({
      name: "astro",
      color: "magenta",
      command: resolveAstroPython(ASTRO_DIR),
      // 0.0.0.0 so LAN-mode phones can reach the engine directly (matches
      // how the gateway and Vite already bind).
      args: [
        "-m", "uvicorn", "app.main:app", "--reload",
        "--host", "0.0.0.0", "--port", String(PORTS.astro),
      ],
      cwd: ASTRO_DIR,
      env: astroEnv,
    })
  );

  log.info("Starting Express Gateway (:5000)...");
  track(
    startService({
      name: "gateway",
      color: "yellow",
      command: "npm",
      args: ["run", "dev"],
      cwd: GATEWAY_DIR,
      env: gatewayEnv,
      useShell: true,
    })
  );

  log.info("Starting Frontend (Vite :5173)...");
  track(
    startService({
      name: "frontend",
      color: "cyan",
      command: "npm",
      args: ["run", "dev"],
      cwd: FRONTEND_DIR,
      env: frontendEnv,
      useShell: true,
    })
  );
}

// --- Main ------------------------------------------------------------------

async function main() {
  if (!MODES.has(mode)) {
    log.error(`Unknown mode "${mode}". Use: local | lan | tunnel`);
    process.exit(1);
  }

  log.rule();
  log.info(`SkyGuide AI dev — network mode: ${mode.toUpperCase()}`);
  log.rule();

  let tunnelUrls = null;

  if (mode === "tunnel") {
    assertCloudflaredInstalled();
    await assertPortsFree(Object.values(PORTS));

    tunnelUrls = await createTunnels();

    const file = writeRuntimeConfig(ROOT, tunnelUrls);
    log.info(`Runtime config written → ${path.relative(ROOT, file)}`);

    log.banner("Tunnel Mode", [
      ["Frontend", tunnelUrls.frontend],
      ["Backend", tunnelUrls.backend],
      ["Astro", tunnelUrls.astro],
      ["Socket", `${tunnelUrls.backend}  (via backend)`],
      ["QR", `${tunnelUrls.frontend}  (via frontend)`],
    ]);
    log.success("Tunnels ready — URLs injected. Starting services...");
  }

  startServices(tunnelUrls);

  if (mode === "tunnel") {
    log.success(
      `Phone-ready: open ${tunnelUrls.frontend} from anywhere once Vite is up.`
    );
  }
  log.info("Press Ctrl+C to stop everything.");
}

main().catch((err) => {
  log.error(err.message);
  shutdown(1);
});
