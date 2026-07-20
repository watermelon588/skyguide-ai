/**
 * Copy the chosen brand mark out to public/ for the consumers that can't read
 * src/config/brand.js — the installed-PWA icon (companion.webmanifest), the
 * iOS home-screen icon, the pre-JS favicon in the HTML, and the logo in
 * transactional emails (served from the frontend origin).
 *
 * The chosen file is NOT configured here: it is read from the single import in
 * src/config/brand.js, so that file stays the one source of truth.
 *
 *   npm run sync:brand
 */
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BRAND_CONFIG = join(root, "src", "config", "brand.js");
const DEST = join(root, "public", "brand", "logo.png");

const source = await readFile(BRAND_CONFIG, "utf8");
const match = source.match(/from\s+["']\.\.\/assets\/logo\/([\w.-]+)["']/);

if (!match) {
  console.error(
    `Could not find the logo import in ${BRAND_CONFIG}.\n` +
      `Expected a line like:  import logoSrc from "../assets/logo/logo5.png";`,
  );
  process.exit(1);
}

const file = match[1];
const from = join(root, "src", "assets", "logo", file);

await mkdir(dirname(DEST), { recursive: true });
await copyFile(from, DEST);

console.log(`[brand] ${file} -> public/brand/logo.png`);
console.log("[brand] PWA install icon, apple-touch-icon and email logo updated.");
