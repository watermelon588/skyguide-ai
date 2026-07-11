import axios from "axios";

import { getApiBaseUrl } from "../config/network";

/**
 * Observation planner data layer — the user's plan/history on the Express
 * gateway (`/api/v1/observations`). Session-cookie auth on every call, so
 * everything sends credentials. Each function returns the response `data`
 * payload, unwrapped.
 *
 * Lifecycle contract (see API_SPEC.md): planned -> observed | skipped.
 * One *planned* entry per object — the gateway answers 409 on duplicates.
 */
const API = getApiBaseUrl();

/** @param {"planned"|"observed"|"skipped"} [status] optional filter */
export const fetchObservations = async (status) => {
  const response = await axios.get(`${API}/api/v1/observations`, {
    params: status ? { status } : undefined,
    withCredentials: true,
  });
  return response.data.data; // { count, observations }
};

/** @param {{ catalog_id: string, notes?: string, priority?: number }} payload */
export const addObservation = async (payload) => {
  const response = await axios.post(`${API}/api/v1/observations`, payload, {
    withCredentials: true,
  });
  return response.data.data;
};

/** @param {string} id @param {{ status?: string, notes?: string, priority?: number }} changes */
export const updateObservation = async (id, changes) => {
  const response = await axios.patch(
    `${API}/api/v1/observations/${id}`,
    changes,
    { withCredentials: true },
  );
  return response.data.data;
};

/** @param {string} id */
export const removeObservation = async (id) => {
  const response = await axios.delete(`${API}/api/v1/observations/${id}`, {
    withCredentials: true,
  });
  return response.data.data;
};
