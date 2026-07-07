/**
 * Minimal ANSI logger for the dev orchestrator.
 *
 * Zero dependencies on purpose — this runs before any node_modules exist at
 * the repo root. Each managed process gets a colored, padded prefix so the
 * combined output of frontend / gateway / astro / tunnels stays readable.
 */

"use strict";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

const COLORS = {
  gray: "\x1b[90m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  orange: "\x1b[38;5;208m",
};

const PREFIX_WIDTH = 10;

function paint(color, text) {
  const code = COLORS[color] || "";
  return `${code}${text}${RESET}`;
}

function tag(name, color) {
  return paint(color, `[${name}]`.padEnd(PREFIX_WIDTH));
}

function info(message) {
  console.log(`${tag("dev", "orange")} ${message}`);
}

function success(message) {
  console.log(`${tag("dev", "orange")} ${paint("green", message)}`);
}

function warn(message) {
  console.log(`${tag("dev", "orange")} ${paint("yellow", message)}`);
}

function error(message) {
  console.error(`${tag("dev", "orange")} ${paint("red", message)}`);
}

function rule() {
  console.log(paint("gray", "─".repeat(60)));
}

/** Boxed banner used for the tunnel URL summary. */
function banner(title, rows) {
  rule();
  console.log(`${BOLD}${paint("orange", title)}${RESET}`);
  console.log("");
  for (const [label, value] of rows) {
    console.log(`  ${DIM}${label.padEnd(10)}${RESET} ${paint("cyan", value)}`);
  }
  console.log("");
  rule();
}

/**
 * Line-buffered writer that prefixes every line of a child process's output.
 * Returns a function suitable for `stream.on("data", ...)`.
 */
function createPrefixedWriter(name, color, out = process.stdout) {
  let buffer = "";
  const prefix = tag(name, color);
  return (chunk) => {
    buffer += chunk.toString();
    let index;
    while ((index = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, index).replace(/\r$/, "");
      buffer = buffer.slice(index + 1);
      if (line.trim().length > 0) out.write(`${prefix} ${line}\n`);
    }
  };
}

module.exports = {
  paint,
  info,
  success,
  warn,
  error,
  rule,
  banner,
  createPrefixedWriter,
};
