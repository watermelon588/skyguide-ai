import axios from "axios";

import { getApiBaseUrl } from "../config/network";

const API = getApiBaseUrl();

export const register = async (data) => {
  const response = await axios.post(`${API}/api/v1/auth/register`, data, {
    withCredentials: true,
  });
  return response.data;
};

export const login = async (data) => {
  const response = await axios.post(`${API}/api/v1/auth/login`, data, {
    withCredentials: true,
  });
  return response.data;
};

export const logout = async () => {
  const response = await axios.post(`${API}/api/v1/auth/logout`, {}, {
    withCredentials: true,
  });
  return response.data;
};

export const getMe = async () => {
  const response = await axios.get(`${API}/api/v1/auth/me`, {
    withCredentials: true,
  });
  return response.data;
};

/**
 * Email verification by 6-digit code. Both calls are authenticated — sign-up
 * signs you in immediately, so verification happens from inside the app rather
 * than through an emailed link.
 */
export const sendVerificationCode = async () => {
  const response = await axios.post(
    `${API}/api/v1/auth/send-verification-code`,
    {},
    { withCredentials: true },
  );
  return response.data;
};

/** @param {string} code the 6 digits from the email */
export const verifyCode = async (code) => {
  const response = await axios.post(
    `${API}/api/v1/auth/verify-code`,
    { code },
    { withCredentials: true },
  );
  return response.data;
};
