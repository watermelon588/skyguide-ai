const User = require("../models/Users");

/**
 * Community discovery — "who observes near me?" (Feature 6a).
 *
 * Pure gateway logic, zero astronomy: a `$geoNear` over the users'
 * `2dsphere` index, gated by each observer's own privacy settings, returning
 * a PRIVACY-SAFE shape. Exact coordinates and precise distances NEVER leave
 * this boundary — callers get a coarse distance *band* ("~15 km away") and the
 * city/region label the observer already chose to expose, nothing more.
 *
 * Reciprocity is enforced here too: an observer whose own profile is private
 * can't browse the map (you must be discoverable to discover). The controller
 * relays that as a `gate` reason rather than an error.
 */

// The radius chips the UI offers, in kilometres. The request is clamped to one
// of these so an arbitrary `?radius=99999` can't turn discovery into a scrape.
const RADII_KM = [25, 50, 100];
const DEFAULT_RADIUS_KM = 50;

// A hard cap on rows so a dense metro area can't return thousands of cards.
const MAX_RESULTS = 60;

/** Clamp an incoming radius to the allowed set (default 50 km). */
function normalizeRadius(value) {
  const km = Number(value);
  return RADII_KM.includes(km) ? km : DEFAULT_RADIUS_KM;
}

/** True once an observer has actually set a location (not the [0,0] default). */
function hasRealLocation(user) {
  const coords = user?.location?.coordinates;
  return (
    Array.isArray(coords) &&
    coords.length === 2 &&
    !(coords[0] === 0 && coords[1] === 0)
  );
}

/**
 * A coarse, non-invertible distance band. We intentionally lose precision:
 * meters could be triangulated back to a home address, so nearby observers
 * round to ~1 km and everyone past 5 km rounds to the nearest 5 km.
 */
function distanceBand(meters) {
  const km = meters / 1000;
  if (km < 1) return "under 1 km";
  if (km < 5) return `~${Math.round(km)} km`;
  return `~${Math.round(km / 5) * 5} km`;
}

/** "City, State, Country" from whatever labels exist, or null. */
function placeLabel(location) {
  const parts = [location?.city, location?.state, location?.country].filter(
    Boolean,
  );
  return parts.length ? parts.join(", ") : null;
}

/** Telescope one-liner for a card, or null. */
function telescopeSummary(telescopeProfile) {
  const scope = telescopeProfile?.[0];
  if (!scope) return null;
  return {
    name: scope.name || "Telescope",
    aperture_mm: scope.aperture_mm ?? null,
  };
}

/**
 * Observers within `radiusKm` of `currentUser`, nearest first.
 *
 * @param {import("mongoose").Document} currentUser  the signed-in viewer
 * @param {number|string} radius                     requested radius (km)
 * @returns {Promise<{gate: string|null, radiusKm: number, count: number,
 *   observers: Array}>}
 *
 * `gate` is one of:
 *   "private"     — the viewer is private, so can't browse (reciprocity)
 *   "no-location" — the viewer hasn't set a location yet
 *   null          — results returned
 */
async function findNearby(currentUser, radius) {
  const radiusKm = normalizeRadius(radius);

  // Reciprocity: a private observer is invisible to others, so the map is
  // closed to them too. Surfaced as a gate the UI turns into a "make yourself
  // discoverable" nudge — never a hard error.
  if (currentUser.profileVisibility === "private") {
    return { gate: "private", radiusKm, count: 0, observers: [] };
  }
  if (!hasRealLocation(currentUser)) {
    return { gate: "no-location", radiusKm, count: 0, observers: [] };
  }

  const [lng, lat] = currentUser.location.coordinates;

  const rows = await User.aggregate([
    {
      // $geoNear MUST be the first stage. Its `query` pre-filters to observers
      // who have opted into discovery: not private, sharing their location,
      // active, and not the viewer themselves.
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: {
          _id: { $ne: currentUser._id },
          isActive: { $ne: false },
          profileVisibility: { $ne: "private" },
          showApproxLocation: { $ne: false },
        },
      },
    },
    { $limit: MAX_RESULTS },
    {
      // Distinct catalog objects each observer has logged — the "23 observed"
      // badge. Grouped by catalog_id so re-observations don't inflate it.
      $lookup: {
        from: "observations",
        let: { uid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$user", "$$uid"] },
                  { $eq: ["$status", "observed"] },
                ],
              },
            },
          },
          { $group: { _id: "$catalog_id" } },
          { $count: "n" },
        ],
        as: "observedAgg",
      },
    },
    {
      // Explicit whitelist — never `toJSON()`. No email, no coordinates, no
      // flags. Only what a public card is allowed to show.
      $project: {
        _id: 0,
        username: 1,
        displayName: 1,
        avatar: 1,
        bio: 1,
        location: 1,
        telescopeProfile: 1,
        distanceMeters: 1,
        observedCount: {
          $ifNull: [{ $arrayElemAt: ["$observedAgg.n", 0] }, 0],
        },
      },
    },
  ]);

  const observers = rows.map((row) => ({
    username: row.username,
    displayName: row.displayName || "",
    avatar: row.avatar || "",
    bio: row.bio || "",
    place: placeLabel(row.location),
    // The raw metric is dropped here — only the band crosses the boundary.
    distanceBand: distanceBand(row.distanceMeters),
    telescope: telescopeSummary(row.telescopeProfile),
    observedCount: row.observedCount || 0,
  }));

  return { gate: null, radiusKm, count: observers.length, observers };
}

module.exports = {
  findNearby,
  RADII_KM,
  DEFAULT_RADIUS_KM,
};
