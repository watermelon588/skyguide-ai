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

/**
 * Chat rooms available to the viewer — their regional room (once a location is
 * set) plus one private room per accepted ping. There is no global room.
 * @returns {Promise<{rooms:Array, hasRegion:boolean}>}
 */
export const fetchRooms = async () => {
  const response = await axios.get(`${API}/api/v1/community/rooms`, {
    withCredentials: true,
  });
  return response.data.data;
};

/**
 * A page of room history, oldest-first. Live messages arrive over the socket —
 * this is only the backfill.
 * @param {string} roomKey
 * @param {{before?: string}} opts  `before` = oldest createdAt you hold
 * @returns {Promise<{messages:Array, hasMore:boolean}>}
 */
export const fetchRoomMessages = async (roomKey, { before } = {}) => {
  const response = await axios.get(
    `${API}/api/v1/community/rooms/${encodeURIComponent(roomKey)}/messages`,
    { params: before ? { before } : {}, withCredentials: true },
  );
  return response.data.data;
};

/* ------------------------------ pings ------------------------------ */

/**
 * Ask an observer to open a private conversation. Nothing is created until
 * they accept — that consent gate is what keeps DMs moderatable.
 * @returns {Promise<{ping:object|null, room:string|null, alreadyConnected?:boolean, autoAccepted?:boolean}>}
 */
export const sendPing = async (username, note = "") => {
  const response = await axios.post(
    `${API}/api/v1/community/pings`,
    { username, note },
    { withCredentials: true },
  );
  return response.data.data;
};

/** Pending requests, both directions. @returns {Promise<{incoming:Array, outgoing:Array}>} */
export const fetchPings = async () => {
  const response = await axios.get(`${API}/api/v1/community/pings`, {
    withCredentials: true,
  });
  return response.data.data;
};

/** @param {"accept"|"decline"} action */
export const respondToPing = async (id, action) => {
  const response = await axios.patch(
    `${API}/api/v1/community/pings/${id}`,
    { action },
    { withCredentials: true },
  );
  return response.data.data;
};

/* ---------------------------- safety ------------------------------- */

export const blockObserver = async (username) => {
  const response = await axios.post(
    `${API}/api/v1/community/blocks`,
    { username },
    { withCredentials: true },
  );
  return response.data.data;
};

export const unblockObserver = async (username) => {
  const response = await axios.delete(
    `${API}/api/v1/community/blocks/${encodeURIComponent(username)}`,
    { withCredentials: true },
  );
  return response.data.data;
};

export const fetchBlocks = async () => {
  const response = await axios.get(`${API}/api/v1/community/blocks`, {
    withCredentials: true,
  });
  return response.data.data;
};

/** @param {"spam"|"harassment"|"inappropriate"|"other"} reason */
export const reportMessage = async (messageId, reason = "other") => {
  const response = await axios.post(
    `${API}/api/v1/community/reports`,
    { messageId, reason },
    { withCredentials: true },
  );
  return response.data.data;
};
