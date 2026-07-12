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

/** Request a reset link. The gateway answers identically for unknown emails. */
export const forgotPassword = async (email) => {
  const response = await axios.post(`${API}/api/v1/auth/forgot-password`, {
    email,
  });
  return response.data;
};

/** Set a new password via an emailed token. Success also logs the user in. */
export const resetPassword = async (token, password) => {
  const response = await axios.patch(
    `${API}/api/v1/auth/reset-password/${token}`,
    { password },
    { withCredentials: true },
  );
  return response.data;
};

/** Redeem an emailed verification token. */
export const verifyEmail = async (token) => {
  const response = await axios.get(`${API}/api/v1/auth/verify-email/${token}`);
  return response.data;
};

export const resendVerification = async (email) => {
  const response = await axios.post(`${API}/api/v1/auth/resend-verification`, {
    email,
  });
  return response.data;
};
