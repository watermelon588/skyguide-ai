const https = require("https");

/**
 * Geocoding via OpenStreetMap Nominatim — both directions.
 *
 * reverseGeocode (coords -> labels) returns only city/state/country, never
 * anything finer, because that is the ONLY location detail a public profile
 * may show. Best-effort: any failure (network, rate limit, unknown place)
 * resolves to nulls so a location save is never blocked by geocoding.
 *
 * searchPlaces (text -> candidates) backs the observer-location picker, so a
 * user can choose "Leh, Ladakh" instead of hand-typing 34.1526 / 77.5771.
 *
 * Nominatim policy: a descriptive User-Agent is required and requests are
 * limited to ~1/sec. Reverse runs once per location save. Search is debounced
 * client-side and only fires while the picker is open, so both stay well
 * within limits. No API key, no npm dependency.
 */

const HOST = "nominatim.openstreetmap.org";
const TIMEOUT_MS = 4000;

/** GET a Nominatim path, resolving to parsed JSON or null on any failure. */
function getJson(path) {
  return new Promise((resolve) => {
    const request = https.get(
      {
        host: HOST,
        path,
        headers: {
          "User-Agent": "SkyGuideAI/1.0 (observer location labels)",
          Accept: "application/json",
        },
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          return resolve(null);
        }
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(null);
          }
        });
      },
    );

    request.on("error", () => resolve(null));
    request.setTimeout(TIMEOUT_MS, () => {
      request.destroy();
      resolve(null);
    });
  });
}

function pickCity(address = {}) {
  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    null
  );
}

/**
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{ city: string|null, state: string|null, country: string|null }>}
 */
async function reverseGeocode(latitude, longitude) {
  const empty = { city: null, state: null, country: null };
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return empty;
  }

  const data = await getJson(
    `/reverse?format=jsonv2&zoom=10&addressdetails=1` +
      `&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
  );

  const address = data?.address;
  if (!address) return empty;

  return {
    city: pickCity(address),
    state: address.state || address.region || null,
    country: address.country || null,
  };
}

/** Max candidates handed back to the picker — a dropdown, not a gazetteer. */
const SEARCH_LIMIT = 6;

/**
 * Free-text place search for the observer-location picker.
 *
 * Coordinates come back at full Nominatim precision, which is correct here:
 * these are the coordinates of a PUBLIC place the user deliberately chose
 * ("Leh"), not a device fix on their house. The privacy fuzzing that applies
 * to the community map is a separate concern, applied at that boundary.
 *
 * @param {string} query
 * @returns {Promise<Array<{
 *   label: string, city: string|null, state: string|null,
 *   country: string|null, latitude: number, longitude: number
 * }>>} best-first candidates, or [] on any failure
 */
async function searchPlaces(query) {
  const q = String(query ?? "").trim();
  if (q.length < 2) return [];

  const rows = await getJson(
    `/search?format=jsonv2&addressdetails=1&limit=${SEARCH_LIMIT}` +
      `&q=${encodeURIComponent(q)}`,
  );

  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const latitude = Number(row.lat);
      const longitude = Number(row.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

      const address = row.address || {};
      return {
        label: row.display_name || q,
        city: pickCity(address),
        state: address.state || address.region || null,
        country: address.country || null,
        latitude,
        longitude,
      };
    })
    .filter(Boolean);
}

module.exports = { reverseGeocode, searchPlaces };
