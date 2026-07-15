import axios from "axios";

import { getApiBaseUrl } from "../config/network";

/**
 * Notification data layer (Feature 7) — the in-app centre and its preferences,
 * on the Express gateway. Cookie auth throughout.
 *
 * Live arrivals come over the "/notifications" socket namespace (see
 * socket.service.createNotificationSocket); this module is the source of truth
 * the client reconciles against.
 */
const API = getApiBaseUrl();

/** @returns {Promise<{notifications:Array, unread:number, hasMore:boolean}>} */
export const fetchNotifications = async ({ before } = {}) => {
  const response = await axios.get(`${API}/api/v1/notifications`, {
    params: before ? { before } : {},
    withCredentials: true,
  });
  return response.data.data;
};

export const markNotificationRead = async (id) => {
  const response = await axios.patch(
    `${API}/api/v1/notifications/${id}/read`,
    {},
    { withCredentials: true },
  );
  return response.data.data;
};

export const markAllNotificationsRead = async () => {
  const response = await axios.patch(
    `${API}/api/v1/notifications/read-all`,
    {},
    { withCredentials: true },
  );
  return response.data.data;
};

/** @returns {Promise<{notificationPrefs:object}>} */
export const fetchNotificationPrefs = async () => {
  const response = await axios.get(`${API}/api/v1/notifications/preferences`, {
    withCredentials: true,
  });
  return response.data.data;
};

/** @param {{digest?:boolean, digestHourLocal?:number, greatNight?:boolean, issAlerts?:boolean, email?:boolean}} changes */
export const updateNotificationPrefs = async (changes) => {
  const response = await axios.patch(
    `${API}/api/v1/notifications/preferences`,
    changes,
    { withCredentials: true },
  );
  return response.data.data;
};
