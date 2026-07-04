/**
 * Location helpers.
 *
 * The MongoDB user schema stores location as GeoJSON:
 *   location.coordinates = [longitude, latitude]
 *
 * Because the schema defaults coordinates to [0, 0], `user.location` is
 * never actually null. The real "location not set yet" signal is therefore
 * coordinates being absent or equal to [0, 0].
 */

/**
 * Whether the user has a real observing location set.
 * @param {object|null} user
 * @returns {boolean}
 */
export function hasLocation(user) {
  const coords = user?.location?.coordinates;

  if (!Array.isArray(coords) || coords.length < 2) return false;

  const [longitude, latitude] = coords;

  if (typeof longitude !== "number" || typeof latitude !== "number") {
    return false;
  }

  // Default / unset sentinel.
  if (longitude === 0 && latitude === 0) return false;

  return true;
}

/**
 * Extract readable location fields from a user.
 * Note the GeoJSON order: coordinates = [longitude, latitude].
 *
 * `city` / `state` / `country` are reserved for reverse geocoding (added
 * later). They read from optional schema fields and are null until then, so
 * the UI can render the slot today without a layout change tomorrow.
 *
 * @param {object|null} user
 */
export function getObserverLocation(user) {
  const location = user?.location;
  const coords = location?.coordinates;

  const longitude = Array.isArray(coords) ? coords[0] : null;
  const latitude = Array.isArray(coords) ? coords[1] : null;

  return {
    latitude: typeof latitude === "number" ? latitude : null,
    longitude: typeof longitude === "number" ? longitude : null,
    timezone: location?.timezone ?? null,
    elevation_m:
      typeof location?.elevation_m === "number" ? location.elevation_m : null,
    city: location?.city ?? null,
    state: location?.state ?? null,
    country: location?.country ?? null,
  };
}

/**
 * Build a "City, State, Country" string from whatever parts exist.
 * Returns null when nothing is known yet (pre reverse-geocoding).
 * @param {{ city?:string|null, state?:string|null, country?:string|null }} parts
 * @returns {string|null}
 */
export function formatPlaceName({ city, state, country } = {}) {
  const label = [city, state, country].filter(Boolean).join(", ");
  return label.length > 0 ? label : null;
}
