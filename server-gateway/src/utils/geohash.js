/**
 * Geohash encoding/decoding (standard base32) — used to bucket observers into
 * regional chat rooms without storing anything more precise than a cell id, and
 * to place them on the community map without revealing where they live.
 *
 * Implemented in-house rather than pulling a dependency: the algorithm is a
 * fixed, well-specified bit-interleave.
 *
 * Cell size by precision (roughly, at the equator):
 *   4 -> ~39 km × ~20 km   (city / metro scale — what rooms use)
 *   5 -> ~4.9 km × ~4.9 km (too small; would fragment rooms)
 * Precision 4 is the room granularity per the Feature 6 decision: start coarse
 * so rooms have people in them, rather than correct-but-empty micro-cells.
 */

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/** Room granularity. Changing this re-buckets every user — see ROOM_PRECISION. */
const ROOM_PRECISION = 4;

/**
 * @param {number} lat  latitude  (-90..90)
 * @param {number} lon  longitude (-180..180)
 * @param {number} precision  number of base32 characters
 * @returns {string} the geohash
 */
function encode(lat, lon, precision = ROOM_PRECISION) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new TypeError("geohash.encode requires finite lat/lon");
  }

  let idx = 0; // index into BASE32, built 5 bits at a time
  let bit = 0;
  let evenBit = true; // even bits carry longitude, odd bits latitude
  let hash = "";

  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;

  while (hash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) {
        idx = idx * 2 + 1;
        lonMin = lonMid;
      } else {
        idx *= 2;
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        idx = idx * 2 + 1;
        latMin = latMid;
      } else {
        idx *= 2;
        latMax = latMid;
      }
    }
    evenBit = !evenBit;

    bit += 1;
    if (bit === 5) {
      hash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }

  return hash;
}

/**
 * The CENTRE of a geohash cell — the community map's privacy primitive.
 *
 * Every observer in the same cell decodes to the exact same point, which is
 * the property that matters: the pin is not "their location, blurred", it is
 * "the cell they are somewhere inside". There is no jitter to average out over
 * repeated reads, so unlike rounding-with-noise this cannot be inverted back
 * toward a home address no matter how many times a client polls.
 *
 * At ROOM_PRECISION 4 a cell is ~39 km × ~20 km, so a pin says "this metro
 * area" and nothing finer.
 *
 * @param {string} hash  a base32 geohash
 * @returns {{ latitude: number, longitude: number }|null} null if malformed
 */
function decodeCenter(hash) {
  if (typeof hash !== "string" || hash.length === 0) return null;

  let evenBit = true;
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;

  for (const char of hash.toLowerCase()) {
    const idx = BASE32.indexOf(char);
    if (idx === -1) return null;

    // Walk the 5 bits of this character, most significant first — the exact
    // inverse of the interleave in encode().
    for (let shift = 4; shift >= 0; shift -= 1) {
      const bit = (idx >> shift) & 1;
      if (evenBit) {
        const lonMid = (lonMin + lonMax) / 2;
        if (bit === 1) lonMin = lonMid;
        else lonMax = lonMid;
      } else {
        const latMid = (latMin + latMax) / 2;
        if (bit === 1) latMin = latMid;
        else latMax = latMid;
      }
      evenBit = !evenBit;
    }
  }

  return {
    latitude: (latMin + latMax) / 2,
    longitude: (lonMin + lonMax) / 2,
  };
}

module.exports = { encode, decodeCenter, ROOM_PRECISION };
