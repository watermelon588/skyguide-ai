import axios from "axios";

import { getApiBaseUrl } from "../config/network";

/**
 * Profile data layer — identity, privacy and avatar on the Express gateway.
 * Cookie auth on the /me routes; the public observer route is reachable
 * anonymously (the server gates visibility). Each call returns the `data`
 * payload, unwrapped.
 */
const API = getApiBaseUrl();

export const fetchMyProfile = async () => {
  const response = await axios.get(`${API}/api/v1/users/me/profile`, {
    withCredentials: true,
  });
  return response.data.data;
};

/** @param {{displayName?:string,bio?:string,profileVisibility?:string,showApproxLocation?:boolean}} changes */
export const updateMyProfile = async (changes) => {
  const response = await axios.patch(`${API}/api/v1/users/me/profile`, changes, {
    withCredentials: true,
  });
  return response.data.data;
};

/** @param {string} dataUrl client-cropped image data URL */
export const uploadAvatar = async (dataUrl) => {
  const response = await axios.post(
    `${API}/api/v1/users/me/avatar`,
    { avatar: dataUrl },
    { withCredentials: true },
  );
  return response.data.data;
};

export const removeAvatar = async () => {
  const response = await axios.delete(`${API}/api/v1/users/me/avatar`, {
    withCredentials: true,
  });
  return response.data.data;
};

/** Public observer profile by username (visibility-gated server-side). */
export const fetchPublicProfile = async (username) => {
  const response = await axios.get(`${API}/api/v1/observers/${username}`, {
    withCredentials: true, // sent so "observers-only" profiles resolve when signed in
  });
  return response.data.data;
};
