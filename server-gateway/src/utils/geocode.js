const https = require("https");

/**
 * Coarse reverse geocoding via OpenStreetMap Nominatim.
 *
 * Returns only city/state/country labels — never anything finer — because
 * this is the ONLY location detail a public profile may show. Best-effort:
 * any failure (network, rate limit, unknown place) resolves to nulls so a
 * location save is never blocked by geocoding.
 *
 * Nominatim policy: a descriptive User-Agent is required and requests are
 * limited to ~1/sec. We call this once per location save, so we stay well
 * within limits without extra throttling. No API key, no npm dependency.
 */

const HOST = "nominatim.openstreetmap.org";
const TIMEOUT_MS = 4000;

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
function reverseGeocode(latitude, longitude) {
  return new Promise((resolve) => {
    const empty = { city: null, state: null, country: null };
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return resolve(empty);
    }

    const path =
      `/reverse?format=jsonv2&zoom=10&addressdetails=1` +
      `&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`;

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
          return resolve(empty);
        }
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => {
          try {
            const address = JSON.parse(body).address || {};
            resolve({
              city: pickCity(address),
              state: address.state || address.region || null,
              country: address.country || null,
            });
          } catch {
            resolve(empty);
          }
        });
      },
    );

    request.on("error", () => resolve(empty));
    request.setTimeout(TIMEOUT_MS, () => {
      request.destroy();
      resolve(empty);
    });
  });
}

module.exports = { reverseGeocode };
