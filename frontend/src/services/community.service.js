import axios from "axios";

import { getApiBaseUrl } from "../config/network";

/**
 * Community data layer — nearby-observer discovery on the Express gateway
 * (Feature 6a). Cookie auth: the viewer's own location anchors the search
 * server-side, so there's nothing to pass but the radius.
 *
 * The response carries a `gate` field — "private" | "no-location" | null —
 * which is a UX state, not an error, so callers branch on it rather than
 * catching.
 */
const API = getApiBaseUrl();

/**
 * @param {25|50|100} radiusKm  search radius (server clamps to the allowed set)
 * @returns {Promise<{gate:string|null, radiusKm:number, count:number, observers:Array}>}
 */
export const fetchNearbyObservers = async (radiusKm) => {
  const response = await axios.get(`${API}/api/v1/community/nearby`, {
    params: { radius: radiusKm },
    withCredentials: true,
  });
  return response.data.data;
};
