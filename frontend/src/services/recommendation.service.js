import axios from "axios";

import { getApiBaseUrl } from "../config/network";

/**
 * Recommendation gateway endpoints (Feature 8).
 *
 * All four go through the Express gateway (never the engine directly) because
 * the payloads are personalized — the gateway attaches the user's telescope
 * and observation history before asking the engine, and the brief is cached
 * per user there.
 */

const API = getApiBaseUrl();
const withAuth = { withCredentials: true };

/** Personalized ranking of tonight's sky, with reasons + best windows. */
export const fetchRecommendations = async (limit = 10) => {
  const response = await axios.get(`${API}/api/v1/recommendations`, {
    params: { limit },
    ...withAuth,
  });
  return response.data.data;
};

/** The LLM "Tonight's Brief" — cached server-side (~4 h per user). */
export const fetchBrief = async () => {
  const response = await axios.get(`${API}/api/v1/recommendations/brief`, withAuth);
  return response.data.data;
};

/** Light pollution at the observer's saved location. */
export const fetchSkyQuality = async () => {
  const response = await axios.get(
    `${API}/api/v1/recommendations/sky-quality`,
    withAuth,
  );
  return response.data.data;
};

/** Nearest meaningfully darker observing sites (reverse-geocoded names). */
export const fetchDarkSites = async (radiusKm = 150) => {
  const response = await axios.get(`${API}/api/v1/recommendations/dark-sites`, {
    params: { radius: radiusKm },
    ...withAuth,
  });
  return response.data.data;
};
