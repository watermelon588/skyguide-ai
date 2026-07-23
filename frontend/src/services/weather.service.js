import axios from "axios";

import { getAstroApiBase } from "../config/network";

/**
 * The weather engine lives on the FastAPI Astro Engine, not the Express
 * gateway. Per the system architecture, React may call the Astro Engine
 * directly for scientific data. No auth cookie is required for this endpoint.
 * The base URL is resolved from the network config (mode-aware).
 */
const ASTRO_API = getAstroApiBase();

/**
 * Fetch current weather + observing conditions for a coordinate.
 *
 * Reuses POST /api/v1/weather/current (unchanged). Returns just the `data`
 * payload: `{ weather, observing_conditions }`.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{ weather: object, observing_conditions: object }>}
 */
export const fetchCurrentWeather = async (latitude, longitude) => {
  const response = await axios.post(`${ASTRO_API}/api/v1/weather/current`, {
    latitude,
    longitude,
  });
  return response.data.data;
};
