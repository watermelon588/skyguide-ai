import axios from "axios";

import { getAstroBaseUrl } from "../config/network";

/**
 * Satellite pass data layer — Skyfield-computed station passes on the
 * FastAPI Astro Engine (same direct-call pattern as the other science
 * services; no auth cookie needed).
 */
const ASTRO_API = getAstroBaseUrl();

/**
 * Upcoming passes above 10° for the observer.
 * Returns `{ satellite, window_hours, count, passes }` where each pass is
 * `{ rise, peak, set, duration_minutes, max_altitude_deg }` and each point
 * carries `{ utc, local, altitude_deg, azimuth_deg }`.
 */
export const fetchPasses = async ({
  latitude,
  longitude,
  timezone,
  hours = 48,
  satellite = "ISS",
}) => {
  const response = await axios.post(`${ASTRO_API}/api/v1/satellites/passes`, {
    latitude,
    longitude,
    timezone,
    hours,
    satellite,
  });
  return response.data.data;
};
