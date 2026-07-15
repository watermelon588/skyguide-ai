/**
 * Browser geolocation, wrapped so its failure modes are legible.
 *
 * Three things the bare API does badly, all of which showed up as "Refresh GPS
 * does nothing":
 *
 *  1. On a non-secure origin (LAN mode — http://192.168.x.x:5173 — which this
 *     app supports for phone pairing) `navigator.geolocation` is UNDEFINED.
 *     Calling it threw a TypeError that surfaced as the raw message
 *     "Cannot read properties of undefined", which tells the user nothing.
 *  2. enableHighAccuracy:true asks a desktop with no GPS radio to do something
 *     it cannot, and it frequently just times out. Phones want high accuracy;
 *     laptops want an answer. So: try precise, fall back to coarse.
 *  3. maximumAge:0 forbids the cached fix, which is the fast path desktops
 *     actually have. Refresh still wants a fresh reading, so this stays 0 on
 *     the first attempt and relaxes only on the retry.
 *
 * Rejections always carry a `.code` matching GeolocationPositionError
 * (1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT) so callers can keep
 * switching on it, plus a human `.message`.
 */

/** GeolocationPositionError codes, named. */
export const GEO_ERROR = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
  /** Ours: the API isn't available at all on this origin. */
  UNSUPPORTED: 4,
};

function geoError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/** One getCurrentPosition call, promisified. */
function requestPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Resolve the observer's current position.
 *
 * @returns {Promise<GeolocationPosition>}
 * @throws {Error & {code:number}} see GEO_ERROR
 */
export async function getCurrentLocation() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    // Secure-context failure is the overwhelmingly likely reason, and it's
    // fixable — say which of the two it is rather than "unsupported".
    const insecure =
      typeof window !== "undefined" && window.isSecureContext === false;
    throw geoError(
      GEO_ERROR.UNSUPPORTED,
      insecure
        ? "Location needs a secure connection. Open SkyGuide over HTTPS or on localhost."
        : "This browser doesn't provide location access.",
    );
  }

  try {
    return await requestPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  } catch (err) {
    // A denial is final — retrying just asks the OS the same question again.
    if (err?.code === GEO_ERROR.PERMISSION_DENIED) {
      throw geoError(
        GEO_ERROR.PERMISSION_DENIED,
        "Location permission is blocked. Allow it for this site (and check your system location setting), then try again.",
      );
    }

    // Timeout / unavailable: very often a desktop being asked for GPS-grade
    // precision it has no hardware for. Ask again, coarsely, and accept a
    // recent cached fix — a two-minute-old position is still the right city.
    try {
      return await requestPosition({
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 120000,
      });
    } catch (retryErr) {
      throw geoError(
        retryErr?.code ?? GEO_ERROR.POSITION_UNAVAILABLE,
        retryErr?.code === GEO_ERROR.TIMEOUT
          ? "Your device took too long to find a location. Try again, or set your location manually."
          : "Your device couldn't determine a location. Set it manually instead.",
      );
    }
  }
}
