import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "../lib/api";
import { useQueryClient } from "@tanstack/react-query";

// Split into two files isn't needed — just make sure the context and hook
// are the ONLY two named exports so Vite Fast Refresh works correctly.

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Restore session from localStorage on app mount
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      authApi
        .me()
        .then(({ data }) => setUser(data))
        .catch(() => {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    queryClient.removeQueries();
    setUser(data.user);
    return data.user;
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) await authApi.logout(refresh);
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      queryClient.removeQueries();
      setUser(null);
    }
  }, [queryClient]);

  const updateUser = useCallback((updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
