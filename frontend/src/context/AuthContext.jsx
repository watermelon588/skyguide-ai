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

  // Both endpoints set the session cookie AND return the user, so the user is
  // read straight from that response. The old code threw away the response and
  // issued a second /auth/me — which is what surfaced "not authenticated" on
  // sign-up, because register used to set no cookie at all.
  const loginUser = async (credentials) => {
    const response = await login(credentials);
    setUser(response.data.user);
    return response.data;
  };

  const registerUser = async (data) => {
    const response = await register(data);
    setUser(response.data.user);
    return response.data; // { user, emailSent }
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
