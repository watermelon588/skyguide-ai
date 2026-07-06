import axios from "axios";

import { getApiBaseUrl } from "../config/network";

/**
 * Telescope persistence service (REST — replaces the Session 10 LocalStorage stub).
 *
 * The ONLY place the telescope talks to storage. Hooks and components go through
 * these functions, never axios directly. Cookie auth rides along via
 * withCredentials; the gateway derives the owner from the session, so no userId
 * is ever sent. Each function returns the API `data` (the saved telescope, or
 * null when none is configured).
 *
 * Endpoints: GET/POST/PATCH/DELETE /api/v1/telescope
 */

const API = getApiBaseUrl();
const BASE = `${API}/api/v1/telescope`;
const withCredentials = { withCredentials: true };

/** Fetch the authenticated user's telescope, or null if none configured. */
export const getTelescope = async () => {
  const response = await axios.get(BASE, withCredentials);
  return response.data?.data ?? null;
};

/** Create the user's telescope; returns the saved record. */
export const createTelescope = async (telescope) => {
  const response = await axios.post(BASE, telescope, withCredentials);
  return response.data?.data ?? null;
};

/** Update the user's telescope; returns the saved record. */
export const updateTelescope = async (telescope) => {
  const response = await axios.patch(BASE, telescope, withCredentials);
  return response.data?.data ?? null;
};

/** Delete the user's telescope. */
export const deleteTelescope = async () => {
  const response = await axios.delete(BASE, withCredentials);
  return response.data;
};
