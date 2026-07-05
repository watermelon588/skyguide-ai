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
