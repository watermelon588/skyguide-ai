import axios from "axios";

import { getAstroBaseUrl } from "../config/network";

/**
 * "Tonight" experience data layer.
 *
 * All astronomy math lives on the FastAPI Astro Engine — the frontend only
 * fetches results. Per the architecture, React may call the Astro Engine
 * directly for scientific data (same pattern as weather.service.js). No auth
 * cookie is required for these endpoints.
 */
const ASTRO_API = getAstroBaseUrl();

/**
 * Every object currently above the horizon, ranked by visibility score.
 * Returns `{ observer, utc_time, count, objects }` where each object carries
 * `{ catalog_id, name, object_type, constellation, altitude_deg, azimuth_deg,
 *    hour_angle_hours, visibility_score }`.
 */
export const fetchObservable = async ({ latitude, longitude, timezone }) => {
  const response = await axios.post(`${ASTRO_API}/api/v1/visibility/observable`, {
    latitude,
    longitude,
    timezone,
  });
  return response.data.data;
};

/**
 * Full lunar state for the observer — phase, illumination, age, rise/set,
 * distance, angular diameter, alt/az. Returns the `moon` sub-object plus
 * `utc_time`.
 */
export const fetchMoon = async ({ latitude, longitude, timezone }) => {
  const response = await axios.post(`${ASTRO_API}/api/v1/moon/current`, {
    latitude,
    longitude,
    timezone,
  });
  return response.data.data;
};

/**
 * The seeded celestial catalog (static science content: magnitude, size,
 * distance, descriptions, observation tips, difficulty, season, media).
 * Fetched once and merged client-side with the live visibility geometry.
 */
export const fetchCatalog = async ({ limit = 100 } = {}) => {
  const response = await axios.get(`${ASTRO_API}/api/v1/catalog`, {
    params: { page: 1, limit },
  });
  return response.data.data;
};
