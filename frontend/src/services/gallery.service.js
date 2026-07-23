import axios from "axios";

import { getApiBaseUrl } from "../config/network";

const API = getApiBaseUrl();
const BASE = `${API}/api/v1/gallery`;

/**
 * Community gallery data layer.
 *
 * Photo URLs come back from the API as ROOT-RELATIVE paths ("/uploads/..."),
 * because the gateway shouldn't hardcode its own hostname. `absoluteUrl`
 * resolves them against the gateway origin — without it the browser would
 * resolve them against the frontend origin (a different host in every mode)
 * and every image would 404.
 */
export const absoluteUrl = (url) =>
  url?.startsWith("/") ? `${API}${url}` : url;

const withAbsoluteUrls = (posts = []) =>
  posts.map((post) => ({ ...post, url: absoluteUrl(post.url) }));

/** The whole gallery. `sort` is "top" (most liked) or "recent". */
export const fetchGallery = async (sort = "top") => {
  const response = await axios.get(BASE, {
    params: { sort },
    withCredentials: true,
  });
  return withAbsoluteUrls(response.data.data.posts);
};

/** The ten most-liked photos — the featured strip. */
export const fetchTopGallery = async () => {
  const response = await axios.get(`${BASE}/top`, { withCredentials: true });
  return withAbsoluteUrls(response.data.data.posts);
};

/** One observer's photos. */
export const fetchObserverGallery = async (username) => {
  const response = await axios.get(
    `${BASE}/observer/${encodeURIComponent(username)}`,
    { withCredentials: true },
  );
  return withAbsoluteUrls(response.data.data.posts);
};

/**
 * Share a photo.
 *
 * Sent as multipart/form-data — NOT a base64 data URL like the avatar flow.
 * Astrophotography runs to several megabytes and base64 inflates it by a third,
 * which would blow past the JSON body limit and bloat the document.
 *
 * @param {File} file
 * @param {string} caption
 */
export const uploadPhoto = async (file, caption = "") => {
  const form = new FormData();
  form.append("image", file);
  form.append("caption", caption);

  const response = await axios.post(BASE, form, { withCredentials: true });
  const post = response.data.data.post;
  return { ...post, url: absoluteUrl(post.url) };
};

/** Toggle your like on a photo. */
export const toggleLike = async (id) => {
  const response = await axios.post(
    `${BASE}/${id}/like`,
    {},
    { withCredentials: true },
  );
  const post = response.data.data.post;
  return { ...post, url: absoluteUrl(post.url) };
};

/** Remove one of your own photos. */
export const deletePhoto = async (id) => {
  const response = await axios.delete(`${BASE}/${id}`, {
    withCredentials: true,
  });
  return response.data.data;
};
