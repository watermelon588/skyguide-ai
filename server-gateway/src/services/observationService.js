const Observation = require("../models/Observation");

/**
 * Observation planner business logic.
 *
 * Owns payload sanitisation, the planned-once-per-object rule, status
 * transitions and ownership checks. The thin controller only shapes HTTP.
 */

/** Build a 4xx error the global handler will surface with the right status. */
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const STATUSES = ["planned", "observed", "skipped"];
/** Statuses an existing entry may transition to (from "planned"). */
const RESOLVED = ["observed", "skipped"];

function sanitizeCatalogId(value) {
  const id = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!id || id.length > 20) return null;
  return id;
}

function sanitizeNotes(value) {
  if (value == null) return undefined; // "not provided" — keep existing
  const notes = String(value).trim();
  if (notes.length > 2000) {
    throw httpError(400, "Notes must be 2000 characters or fewer.");
  }
  return notes;
}

function sanitizePriority(value) {
  if (value == null) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw httpError(400, "Priority must be an integer from 1 (highest) to 5.");
  }
  return n;
}

/**
 * The user's observation list, newest first, optionally filtered by status
 * (clients group/tab by status, so the default order stays simple).
 */
async function listObservations(userId, { status } = {}) {
  if (status && !STATUSES.includes(status)) {
    throw httpError(400, `Unknown status '${status}'. Use ${STATUSES.join(" | ")}.`);
  }
  const query = { user: userId };
  if (status) query.status = status;
  return Observation.find(query).sort({ createdAt: -1 });
}

/** Add an object to the plan. One planned entry per object per user. */
async function addObservation(userId, payload = {}) {
  const catalog_id = sanitizeCatalogId(payload.catalog_id);
  if (!catalog_id) {
    throw httpError(400, "catalog_id is required (e.g. 'M42').");
  }

  const doc = {
    user: userId,
    catalog_id,
    status: "planned",
    notes: sanitizeNotes(payload.notes) ?? "",
  };
  const priority = sanitizePriority(payload.priority);
  if (priority !== undefined) doc.priority = priority;

  try {
    return await Observation.create(doc);
  } catch (error) {
    if (error.code === 11000) {
      throw httpError(409, `${catalog_id} is already on your plan.`);
    }
    throw error;
  }
}

/**
 * Update an entry the user owns: notes/priority anytime; status may move
 * planned -> observed|skipped (stamping resolvedAt) or back to planned
 * (re-queue, clearing resolvedAt).
 */
async function updateObservation(userId, observationId, payload = {}) {
  const observation = await Observation.findOne({
    _id: observationId,
    user: userId,
  });
  if (!observation) {
    throw httpError(404, "Observation not found.");
  }

  const notes = sanitizeNotes(payload.notes);
  if (notes !== undefined) observation.notes = notes;

  const priority = sanitizePriority(payload.priority);
  if (priority !== undefined) observation.priority = priority;

  if (payload.status != null) {
    if (!STATUSES.includes(payload.status)) {
      throw httpError(400, `Unknown status '${payload.status}'. Use ${STATUSES.join(" | ")}.`);
    }
    if (payload.status !== observation.status) {
      observation.status = payload.status;
      observation.resolvedAt = RESOLVED.includes(payload.status) ? new Date() : null;
    }
  }

  try {
    return await observation.save();
  } catch (error) {
    if (error.code === 11000) {
      throw httpError(409, `${observation.catalog_id} is already on your plan.`);
    }
    // The entry was deleted between our findOne and this save (e.g. two
    // devices racing) — that's a 404, not a server fault.
    if (error.name === "DocumentNotFoundError") {
      throw httpError(404, "Observation not found.");
    }
    throw error;
  }
}

/** Remove an entry the user owns. */
async function removeObservation(userId, observationId) {
  const result = await Observation.findOneAndDelete({
    _id: observationId,
    user: userId,
  });
  if (!result) {
    throw httpError(404, "Observation not found.");
  }
  return result;
}

module.exports = {
  listObservations,
  addObservation,
  updateObservation,
  removeObservation,
};
