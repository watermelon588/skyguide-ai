import axios from "axios";

import { getApiBaseUrl } from "../config/network";

/**
 * Feedback data layer — the footer form. Public endpoint (works signed-out);
 * `withCredentials` still ships the session cookie so signed-in feedback is
 * attributed on the server via optionalAuth.
 */
const API = getApiBaseUrl();

/** @param {{message:string, category?:string, email?:string, page?:string}} payload */
export const submitFeedback = async (payload) => {
  const response = await axios.post(`${API}/api/v1/feedback`, payload, {
    withCredentials: true,
  });
  return response.data;
};
