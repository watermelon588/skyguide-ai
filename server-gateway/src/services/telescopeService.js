const Telescope = require("../models/Telescope");

/**
 * Telescope business logic.
 *
 * Owns everything the thin controller must not: sanitizing the client payload,
 * computing the authoritative focal ratio, and the one-telescope-per-user upsert.
 * The controller only validates the request shape and shapes the HTTP response.
 */

/** Build a 4xx error the global handler will surface with the right status. */
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Coerce to a finite positive number, else null. */
function positiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** focal_length / aperture, rounded to 2 dp. Backend is authoritative. */
function computeFocalRatio(aperture_mm, focal_length_mm) {
  const a = positiveNumber(aperture_mm);
  const f = positiveNumber(focal_length_mm);
  if (!a || !f) return null;
  return Math.round((f / a) * 100) / 100;
}

/**
 * Whitelist + normalise a client payload into a persistable telescope.
 *
 * Never trusts client-sent `focal_ratio`, `reserved`, `userId`, or timestamps —
 * those are owned by the backend. Missing required fields surface as a 400 here
 * (belt) and are also enforced by the schema (braces).
 */
function sanitize(payload = {}) {
  const brand = typeof payload.brand === "string" ? payload.brand.trim() : "";
  const model = typeof payload.model === "string" ? payload.model.trim() : "";
  const aperture_mm = positiveNumber(payload.aperture_mm);
  const focal_length_mm = positiveNumber(payload.focal_length_mm);

  const missing = [];
  if (!brand) missing.push("brand");
  if (!model) missing.push("model");
  if (!payload.type) missing.push("type");
  if (!aperture_mm) missing.push("aperture_mm");
  if (!focal_length_mm) missing.push("focal_length_mm");
  if (!payload.mount) missing.push("mount");

  if (missing.length) {
    throw httpError(400, `Missing or invalid fields: ${missing.join(", ")}.`);
  }

  const weight = positiveNumber(payload.weight_kg);

  return {
    brand,
    model,
    nickname:
      typeof payload.nickname === "string" ? payload.nickname.trim() : "",
    type: payload.type,
    aperture_mm,
    focal_length_mm,
    focal_ratio: computeFocalRatio(aperture_mm, focal_length_mm),
    mount: payload.mount,
    tracking: Boolean(payload.tracking),
    goto: Boolean(payload.goto),
    cameraSupport: Boolean(payload.cameraSupport),
    weight_kg: weight,
    notes: typeof payload.notes === "string" ? payload.notes.trim() : "",
  };
}

/** The authenticated user's telescope, or null if none configured. */
async function getTelescope(userId) {
  return Telescope.findOne({ userId });
}

/**
 * Create or replace the user's single telescope (upsert on userId).
 *
 * A user only ever has one active telescope, so both "create" and "update" from
 * the UI land here. The unique userId index makes this idempotent per user.
 */
async function saveTelescope(userId, payload) {
  const data = sanitize(payload);

  return Telescope.findOneAndUpdate(
    { userId },
    { $set: { ...data, userId } },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );
}

/** Delete the user's telescope. Returns true if one existed. */
async function deleteTelescope(userId) {
  const result = await Telescope.findOneAndDelete({ userId });
  return Boolean(result);
}

module.exports = {
  getTelescope,
  saveTelescope,
  deleteTelescope,
  computeFocalRatio,
};
