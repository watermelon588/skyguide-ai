import axios from "axios";

import { getAstroApiBase } from "../config/network";

/**
 * "Tonight" experience data layer.
 *
 * All astronomy math lives on the FastAPI Astro Engine — the frontend only
 * fetches results. Per the architecture, React may call the Astro Engine
 * directly for scientific data (same pattern as weather.service.js). No auth
 * cookie is required for these endpoints.
 */
const ASTRO_API = getAstroApiBase();

/**
 * The night's top recommended objects, ranked by visibility score.
 *
 * The catalog is ~13k objects, so this deliberately does NOT ask for everything
 * above the horizon (thousands of rows, multi-megabyte, and mostly anonymous
 * faint galaxies near the zenith). `maxMagnitude` narrows to targets worth an
 * observer's time and `limit` caps the list — the full catalog is browsable on
 * the Explore page instead. Each object now carries its own display fields
 * (magnitude, size, difficulty, description, thumbnail), so no separate catalog
 * merge is needed.
 *
 * Returns `{ observer, utc_time, moon, count, objects }`.
 */
export const fetchObservable = async (
  { latitude, longitude, timezone },
  { maxMagnitude = 13, limit = 100 } = {},
) => {
  const response = await axios.post(`${ASTRO_API}/api/v1/visibility/observable`, {
    latitude,
    longitude,
    timezone,
    max_magnitude: maxMagnitude,
    limit,
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
 * A page of the seeded celestial catalog (static science content). With ~13k
 * objects this is paginated, not fetched whole — the Explore page drives it.
 */
export const fetchCatalog = async ({ limit = 100, page = 1, ...filters } = {}) => {
  const response = await axios.get(`${ASTRO_API}/api/v1/catalog`, {
    params: { page, limit, ...filters },
  });
  return response.data.data;
};

/**
 * One catalog object by id (e.g. "M42", "NGC 253"). The Target Panel uses this
 * to resolve any of the ~13k objects on a cold URL or when the object isn't in
 * tonight's live top-100. Returns the full document, or null on 404.
 */
export const fetchCatalogObject = async (catalogId) => {
  try {
    const response = await axios.get(
      `${ASTRO_API}/api/v1/catalog/${encodeURIComponent(catalogId)}`,
    );
    return response.data.data;
  } catch (error) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
};
