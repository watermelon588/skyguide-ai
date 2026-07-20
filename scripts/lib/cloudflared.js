/**
 * Cloudflare Quick Tunnel management.
 *
 * Spawns `cloudflared tunnel --url <target>` processes and captures the
 * generated `https://*.trycloudflare.com` URL from cloudflared's log output.
 * Tunnels are started BEFORE the local services — cloudflared is happy to
 * proxy to a port that is not listening yet, and this ordering means every
 * service boots with its final URLs already injected (no restarts, ever).
 */

"use strict";

const { spawn, spawnSync } = require("child_process");
const log = require("./logger");

const TUNNEL_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

/**
 * Proof the tunnel can actually carry traffic.
 *
 * The URL is issued by api.cloudflare.com:443, but the data plane runs over
 * port 7844 to the edge. On networks that allow 443 and block 7844 (campus /
 * corporate firewalls) cloudflared prints a perfectly good URL that only ever
 * serves Cloudflare error 1033 — so a URL alone must never be reported as
 * success. Wait for a registered connection before promising the developer
 * anything.
 */
const TUNNEL_CONNECTED_RE = /Registered tunnel connection|connection .* registered/i;

/** Substrings in cloudflared output that indicate an unrecoverable failure. */
const FATAL_PATTERNS = [
  /failed to request quick tunnel/i,
  /failed to unmarshal quick tunnel/i,
  /429 too many requests/i,
  /error="[^"]*bind: [^"]*"/i,
];

/**
 * Verify cloudflared is installed and on PATH. Throws a developer-friendly
 * error (with install instructions) if it is missing.
 */
function assertCloudflaredInstalled() {
  const result = spawnSync("cloudflared", ["--version"], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(
      "cloudflared is not installed or not on PATH.\n" +
        "  Install it and re-run:\n" +
        "    Windows : winget install --id Cloudflare.cloudflared\n" +
        "    macOS   : brew install cloudflared\n" +
        "    Linux   : https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    );
  }
  const version = (result.stdout || result.stderr || "").trim().split("\n")[0];
  log.info(`cloudflared detected — ${version}`);
}

/**
 * Start one Quick Tunnel and resolve `{ name, url, proc }` once the public
 * URL appears in cloudflared's output.
 *
 * Rejects on: process spawn failure, fatal cloudflared errors (rate limits,
 * DNS failures), the process exiting before a URL is seen, or `timeoutMs`
 * elapsing. On rejection the buffered cloudflared output is included so the
 * failure is never silent.
 */
function startQuickTunnel({ name, targetUrl, timeoutMs = 60_000 }) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "cloudflared",
      [
        "tunnel",
        "--url", targetUrl,
        "--no-autoupdate",
        // QUIC (the default) needs outbound UDP 7844; on networks that block
        // or degrade it, the tunnel connects but then flaps with "control
        // stream encountered a failure" retry loops. HTTP/2 over TCP 443 is
        // reliable everywhere.
        "--protocol", "http2",
        // Prefer the IPv4 edge — flaky local IPv6 shows up as endless
        // reconnects against 2606:4700::/32 addresses.
        "--edge-ip-version", "4",
      ],
      { stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
    );

    let settled = false;
    let captured = "";
    let url = null;

    const timer = setTimeout(() => {
      // Distinguish the two failures: no URL at all (Cloudflare never issued
      // one) vs. a URL that never connected (the port-7844 firewall case).
      fail(
        url
          ? `The "${name}" tunnel got a URL (${url}) but never established a ` +
              `connection to the Cloudflare edge within ` +
              `${Math.round(timeoutMs / 1000)}s — the URL would only serve ` +
              `error 1033.\n` +
              "  cloudflared needs OUTBOUND port 7844 (TCP for --protocol http2,\n" +
              "  UDP for QUIC). Many campus/corporate/hotel networks allow 443 but\n" +
              "  block 7844, which is exactly this symptom. Verify with:\n" +
              "    Test-NetConnection region1.v2.argotunnel.com -Port 7844\n" +
              "  Workarounds: use a different network (a phone hotspot is the\n" +
              "  quickest test), or use `npm run dev:lan` with the phone on the\n" +
              "  same Wi-Fi — LAN mode needs no tunnel at all."
          : `Timed out after ${Math.round(timeoutMs / 1000)}s waiting for a ` +
              `trycloudflare.com URL for "${name}".`
      );
    }, timeoutMs);

    function fail(reason) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        proc.kill();
      } catch {
        /* already dead */
      }
      const tail = captured.trim().split("\n").slice(-8).join("\n");
      reject(
        new Error(`${reason}${tail ? `\n  cloudflared output:\n${tail}` : ""}`)
      );
    }

    function scan(chunk) {
      if (settled) return;
      captured += chunk.toString();

      for (const pattern of FATAL_PATTERNS) {
        if (pattern.test(captured)) {
          fail(`Cloudflare rejected the quick tunnel for "${name}".`);
          return;
        }
      }

      if (!url) {
        const match = captured.match(TUNNEL_URL_RE);
        if (match) url = match[0];
      }

      // Both halves required: the URL identifies the tunnel, the registered
      // connection proves it can serve.
      if (url && TUNNEL_CONNECTED_RE.test(captured)) {
        settled = true;
        clearTimeout(timer);
        // Stop buffering; keep only surfacing genuine errors after capture.
        proc.stdout.removeAllListeners("data");
        proc.stderr.removeAllListeners("data");
        const surfaceErrors = log.createPrefixedWriter(
          `tunnel:${name}`,
          "blue",
          process.stderr
        );
        const errorOnly = (data) => {
          const text = data.toString();
          if (/\bERR\b|error/i.test(text)) surfaceErrors(text);
        };
        proc.stdout.on("data", errorOnly);
        proc.stderr.on("data", errorOnly);
        resolve({ name, url, proc });
      }
    }

    proc.stdout.on("data", scan);
    proc.stderr.on("data", scan);

    proc.on("error", (err) => {
      fail(`Failed to start cloudflared for "${name}": ${err.message}`);
    });

    proc.on("exit", (code) => {
      if (!settled) {
        fail(
          `cloudflared for "${name}" exited (code ${code}) before the tunnel was ready.`
        );
      }
    });
  });
}

module.exports = { assertCloudflaredInstalled, startQuickTunnel };
