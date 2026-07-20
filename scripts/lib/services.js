/**
 * Application service process management (frontend / gateway / astro engine).
 *
 * Services are spawned with generated tunnel URLs injected as REAL process
 * environment variables. All three config layers already give env vars top
 * priority (Vite env > .env files, dotenv never overrides existing env,
 * pydantic-settings prefers env over .env) — so the permanent, developer-
 * authored `.env` files are never touched, and `network.js` remains the
 * single source of URL resolution.
 */

"use strict";

const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const net = require("net");
const path = require("path");
const log = require("./logger");

/**
 * Spawn one managed service with prefixed, colored output.
 * `useShell` is required for `npm` on Windows (npm is a .cmd shim); direct
 * executables (python.exe) must NOT use a shell or paths with spaces break.
 */
function startService({ name, color, command, args, cwd, env = {}, useShell = false }) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    shell: useShell,
    windowsHide: true,
  });

  const writeOut = log.createPrefixedWriter(name, color, process.stdout);
  const writeErr = log.createPrefixedWriter(name, color, process.stderr);
  child.stdout.on("data", writeOut);
  child.stderr.on("data", writeErr);

  child.on("error", (err) => {
    log.error(`Failed to start ${name}: ${err.message}`);
  });

  return child;
}

/** Resolve the Astro Engine's Python interpreter (venv first, PATH fallback). */
function resolveAstroPython(astroDir) {
  const bin = process.platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"];
  for (const venv of ["venv", ".venv"]) {
    const candidate = path.join(astroDir, venv, ...bin);
    if (fs.existsSync(candidate)) return candidate;
  }
  log.warn("No venv found in astro-engine — falling back to system `python`.");
  return process.platform === "win32" ? "python" : "python3";
}

/**
 * Kill a child and its whole process tree. On Windows, npm/nodemon/vite each
 * wrap real workers in sub-processes, so a plain kill() would orphan them.
 */
function killTree(child) {
  if (!child || child.exitCode !== null || child.killed) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    try {
      child.kill("SIGTERM");
    } catch {
      /* already dead */
    }
  }
}

/**
 * Reject if any of the given ports already has a listener bound.
 *
 * Both address families are probed. A port is free on 0.0.0.0 while another
 * process holds it on [::] (Vite binds IPv6), so an IPv4-only probe reports a
 * false all-clear — the tunnel then points at 5173 while the orchestrator's
 * own Vite silently falls back to 5174, leaving the phone on a stale bundle
 * that still targets localhost. Probing one family is worse than not probing:
 * it fails as a mysterious CORS error instead of a clear port conflict.
 */
function assertPortsFree(ports) {
  const probeOne = (port, host) =>
    new Promise((resolve, reject) => {
      const probe = net
        .createServer()
        .once("error", (err) => {
          probe.close();
          // A host this machine cannot bind (no IPv6 stack) proves nothing
          // about the port — only EADDRINUSE is evidence of a conflict.
          if (err.code === "EADDRINUSE") return resolve(true);
          if (err.code === "EAFNOSUPPORT" || err.code === "EADDRNOTAVAIL") {
            return resolve(false);
          }
          return reject(err);
        })
        .once("listening", () => probe.close(() => resolve(false)));
      probe.listen(port, host);
    });

  const check = async (port) => {
    const inUse = await Promise.all(
      ["0.0.0.0", "::"].map((host) => probeOne(port, host))
    );
    if (inUse.some(Boolean)) {
      throw new Error(
        `Port ${port} is already in use. The tunnel pipeline starts every ` +
          "service itself — stop the process using this port (an already-" +
          "running dev server?) and re-run."
      );
    }
  };

  return Promise.all(ports.map(check));
}

module.exports = { startService, resolveAstroPython, killTree, assertPortsFree };
