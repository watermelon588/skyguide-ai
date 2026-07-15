import axios from "axios";

import { getApiBaseUrl } from "../config/network";

const API = getApiBaseUrl();

/**
 * Update the authenticated observer's location.
 *
 * Reuses the existing PATCH /api/v1/users/location endpoint.
 * Cookie auth is carried automatically via withCredentials.
 *
 * @param {{ latitude:number, longitude:number, timezone:string, elevation_m:number }} payload
 * @returns {Promise<object>} API response body ({ success, message, user })
 */
export const updateLocation = async (payload) => {
  const response = await axios.patch(
    `${API}/api/v1/users/location`,
    payload,
    {
      withCredentials: true,
    },
  );
  return response.data;
};

/**
 * Search places by name for the observer-location picker.
 *
 * Reuses GET /api/v1/users/location/search, which fronts Nominatim on the
 * gateway (keeping the Nominatim User-Agent policy server-side).
 *
 * @param {string} query        free text, e.g. "leh ladakh"
 * @param {AbortSignal} [signal] lets the caller drop a superseded keystroke
 * @returns {Promise<Array<{label:string, city:string|null, state:string|null,
 *   country:string|null, latitude:number, longitude:number}>>}
 */
export const searchLocations = async (query, signal) => {
  const response = await axios.get(`${API}/api/v1/users/location/search`, {
    params: { q: query },
    withCredentials: true,
    signal,
  });
  return response.data.results ?? [];
};
