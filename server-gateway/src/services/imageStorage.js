const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

/**
 * Image persistence backend — the single seam between the app and *where* an
 * uploaded photo actually lives.
 *
 * Two backends, chosen at startup by environment:
 *
 *   • Cloudinary  — when Cloudinary credentials are present. Files live off-box
 *                   on a CDN, so they SURVIVE a gateway redeploy/restart. This
 *                   is what a stateless host (Render/Railway/Vercel functions)
 *                   needs: their local disk is ephemeral and wiped on deploy.
 *   • Local disk  — the fallback. Zero-config local development keeps working
 *                   with no credentials, writing under `uploads/gallery/`.
 *
 * Every backend returns the SAME shape: `{ filename, url }`.
 *   - `filename` is the delete handle (a Cloudinary public_id, or a disk name).
 *   - `url` is the browser-facing address, or `null` for disk (the caller builds
 *     a relative `/uploads/...` path in that case, so it stays correct behind
 *     any host or tunnel).
 *
 * Callers never branch on the backend — they save, resolve, and delete through
 * this module.
 */

// Only real image types; the extension is server-chosen from this allowlist,
// never the client's filename (which can carry path separators or a fake ext).
const ALLOWED_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "gallery");
const DISK_PUBLIC_PREFIX = "/uploads/gallery";
const CLOUD_FOLDER = "skyguide/gallery";

// --- Backend selection ------------------------------------------------------

let cloudinary = null;

/**
 * Configure Cloudinary once, from env. Supports either the single-URL form
 * (`CLOUDINARY_URL=cloudinary://key:secret@cloud`) that the SDK auto-reads, or
 * three discrete vars. Returns the configured client, or null if unconfigured.
 */
function getCloudinary() {
  if (cloudinary !== null) return cloudinary || null;

  const hasUrl = !!process.env.CLOUDINARY_URL;
  const hasParts =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (!hasUrl && !hasParts) {
    cloudinary = false; // memoize "not configured" so we only check once
    return null;
  }

  const client = require("cloudinary").v2;
  // With CLOUDINARY_URL set, the SDK self-configures; the explicit config below
  // covers the discrete-vars form and is a harmless no-op otherwise.
  if (hasParts) {
    client.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  } else {
    client.config({ secure: true });
  }

  cloudinary = client;
  return cloudinary;
}

/** True when uploads will be stored on Cloudinary rather than local disk. */
function isCloudEnabled() {
  return getCloudinary() !== null;
}

// --- Disk backend -----------------------------------------------------------

/** Ensure the upload directory exists (first run, or after a wiped disk). */
async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

async function saveToDisk(buffer, mimetype) {
  await ensureUploadDir();
  const ext = ALLOWED_TYPES.get(mimetype) || ".jpg";
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  // url:null → caller builds the relative /uploads path (host-agnostic).
  return { filename, url: null };
}

async function deleteFromDisk(filename) {
  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename));
  } catch (err) {
    // A missing file must not fail the delete, or the record becomes
    // permanently undeletable.
    if (err.code !== "ENOENT") {
      console.error("Gallery disk cleanup failed:", err.message);
    }
  }
}

// --- Cloudinary backend -----------------------------------------------------

function uploadBuffer(client, buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

async function saveToCloud(client, buffer) {
  const result = await uploadBuffer(client, buffer, {
    folder: CLOUD_FOLDER,
    resource_type: "image",
    // Modest cap so a huge original never becomes a huge delivery. Cloudinary
    // still stores the original; this bounds the derived asset.
    transformation: [{ width: 2000, height: 2000, crop: "limit", quality: "auto" }],
  });
  // public_id is the delete handle; secure_url is the CDN address.
  return { filename: result.public_id, url: result.secure_url };
}

async function deleteFromCloud(client, publicId) {
  try {
    await client.uploader.destroy(publicId, { resource_type: "image" });
  } catch (err) {
    console.error("Cloudinary cleanup failed:", err.message);
  }
}

// --- Public API (backend-agnostic) ------------------------------------------

/**
 * Persist an uploaded image buffer.
 * @returns {Promise<{filename: string, url: string|null}>}
 */
async function save({ buffer, mimetype }) {
  const client = getCloudinary();
  return client ? saveToCloud(client, buffer) : saveToDisk(buffer, mimetype);
}

/**
 * Browser-facing URL for a stored post.
 *
 * Prefers a stored absolute `url` (Cloudinary CDN). Falls back to the disk
 * mount for legacy/local records that only have a `filename`. This is the ONE
 * place a stored image becomes a URL.
 */
function resolveUrl({ url, filename }) {
  if (url) return url;
  return filename ? `${DISK_PUBLIC_PREFIX}/${filename}` : "";
}

/** Remove a stored image. Routes to whichever backend the record used. */
async function remove({ url, filename }) {
  if (!filename) return;
  const client = getCloudinary();
  // `url` present ⇒ the record was stored on Cloudinary (filename is a
  // public_id). Absent ⇒ it's a disk file.
  if (url && client) return deleteFromCloud(client, filename);
  return deleteFromDisk(filename);
}

module.exports = {
  ALLOWED_TYPES,
  UPLOAD_DIR,
  DISK_PUBLIC_PREFIX,
  isCloudEnabled,
  ensureUploadDir,
  save,
  resolveUrl,
  remove,
};
