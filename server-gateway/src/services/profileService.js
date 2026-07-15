const User = require("../models/Users");
const Observation = require("../models/Observation");

/**
 * Profile business logic — identity, privacy, avatar, and the observing
 * résumé derived from the planner. The thin controller only shapes HTTP.
 *
 * Privacy is enforced HERE, at the data boundary: public payloads are built
 * by explicit whitelist (never `user.toJSON()`), so email, exact coordinates,
 * and internal flags can never leak no matter what the caller requests.
 */

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** "City, State, Country" from whatever labels exist, or null. */
function placeLabel(location) {
  const parts = [location?.city, location?.state, location?.country].filter(
    Boolean,
  );
  return parts.length ? parts.join(", ") : null;
}

/** Observing résumé from the planner: distinct objects observed + recents. */
async function observingStats(userId) {
  const observed = await Observation.find({
    user: userId,
    status: "observed",
  })
    .sort({ resolvedAt: -1, createdAt: -1 })
    .select("catalog_id resolvedAt")
    .lean();

  const distinct = new Set(observed.map((o) => o.catalog_id));
  const planned = await Observation.countDocuments({
    user: userId,
    status: "planned",
  });

  return {
    objectsObserved: distinct.size,
    totalLogged: observed.length,
    planned,
    // Deduped most-recent-first list of catalog ids for a "recent" strip.
    recent: [...distinct].slice(0, 8),
  };
}

/** Telescope one-liner for the profile, or null. */
function telescopeSummary(user) {
  const scope = user.telescopeProfile?.[0];
  if (!scope) return null;
  return {
    name: scope.name || "Telescope",
    aperture_mm: scope.aperture_mm ?? null,
    focal_length_mm: scope.focal_length_mm ?? null,
    mount_type: scope.mount_type ?? null,
  };
}

/** The owner's own full profile (private view — includes settings). */
async function getMyProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw httpError(404, "User not found.");

  const stats = await observingStats(userId);
  return {
    username: user.username,
    email: user.email,
    displayName: user.displayName || "",
    bio: user.bio || "",
    avatar: user.avatar || "",
    profileVisibility: user.profileVisibility,
    showApproxLocation: user.showApproxLocation,
    place: placeLabel(user.location),
    memberSince: user.createdAt,
    telescope: telescopeSummary(user),
    stats,
  };
}

const EDITABLE = ["displayName", "bio", "profileVisibility", "showApproxLocation"];
const VISIBILITIES = ["public", "observers", "private"];

/** Whitelisted, validated profile edit. */
async function updateMyProfile(userId, payload = {}) {
  const update = {};

  if (payload.displayName !== undefined) {
    const name = String(payload.displayName).trim();
    if (name.length > 50) throw httpError(400, "Display name must be 50 characters or fewer.");
    update.displayName = name;
  }
  if (payload.bio !== undefined) {
    const bio = String(payload.bio).trim();
    if (bio.length > 280) throw httpError(400, "Bio must be 280 characters or fewer.");
    update.bio = bio;
  }
  if (payload.profileVisibility !== undefined) {
    if (!VISIBILITIES.includes(payload.profileVisibility)) {
      throw httpError(400, `Visibility must be one of ${VISIBILITIES.join(" | ")}.`);
    }
    update.profileVisibility = payload.profileVisibility;
  }
  if (payload.showApproxLocation !== undefined) {
    update.showApproxLocation = Boolean(payload.showApproxLocation);
  }

  if (Object.keys(update).length === 0) {
    throw httpError(400, `Nothing to update. Editable fields: ${EDITABLE.join(", ")}.`);
  }

  await User.findByIdAndUpdate(userId, update, { runValidators: true });
  return getMyProfile(userId);
}

// Inline avatar guardrails: a client-cropped 256px square compresses well
// under ~150 KB; the cap protects the document from oversized payloads.
const MAX_AVATAR_BYTES = 200 * 1024;
const DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,/;

/** Store a client-cropped avatar as an inline data URL. */
async function setAvatar(userId, dataUrl) {
  if (typeof dataUrl !== "string" || !DATA_URL_RE.test(dataUrl)) {
    throw httpError(400, "Avatar must be a PNG, JPEG, or WEBP data URL.");
  }
  if (Buffer.byteLength(dataUrl, "utf8") > MAX_AVATAR_BYTES) {
    throw httpError(413, "Avatar is too large — crop or compress it further.");
  }
  await User.findByIdAndUpdate(userId, { avatar: dataUrl, avatarPublicId: null });
  return getMyProfile(userId);
}

async function clearAvatar(userId) {
  await User.findByIdAndUpdate(userId, { avatar: "", avatarPublicId: null });
  return getMyProfile(userId);
}

/**
 * A public profile by username. `viewerId` is the signed-in viewer (or null).
 *
 * Visibility gate:
 *   private            -> 404 for everyone but the owner (no existence leak)
 *   observers          -> requires any signed-in viewer
 *   public             -> anyone
 * The owner always sees their own profile regardless of setting.
 */
async function getPublicProfile(username, viewerId = null) {
  const user = await User.findOne({ username: username.toLowerCase() });
  if (!user) throw httpError(404, "Observer not found.");

  const isOwner = viewerId && String(user._id) === String(viewerId);
  if (!isOwner) {
    if (user.profileVisibility === "private") {
      throw httpError(404, "Observer not found."); // indistinguishable from absent
    }
    if (user.profileVisibility === "observers" && !viewerId) {
      throw httpError(403, "Sign in to view this observer's profile.");
    }
  }

  const stats = await observingStats(user._id);
  // Explicit whitelist — no email, no coordinates, no settings.
  return {
    username: user.username,
    displayName: user.displayName || "",
    bio: user.bio || "",
    avatar: user.avatar || "",
    place: user.showApproxLocation ? placeLabel(user.location) : null,
    memberSince: user.createdAt,
    telescope: telescopeSummary(user),
    stats: { objectsObserved: stats.objectsObserved, recent: stats.recent },
    isOwner: Boolean(isOwner),
  };
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  setAvatar,
  clearAvatar,
  getPublicProfile,
};
