import axios from "axios";

const API = import.meta.env.VITE_API_URL;

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
