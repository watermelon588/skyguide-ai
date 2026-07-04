import { createContext, useContext, useEffect, useState } from "react";
import { getMe, login, logout, register } from "../services/auth.service";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await getMe();
      setUser(response.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const loginUser = async (credentials) => {
    await login(credentials);

    const response = await getMe();

    setUser(response.user);
  };

  const registerUser = async (data) => {
    await register(data);

    const response = await getMe();

    setUser(response.user);
  };

  const logoutUser = async () => {
    await logout();

    setUser(null);
  };

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated: !!user,
    loginUser,
    registerUser,
    logoutUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
