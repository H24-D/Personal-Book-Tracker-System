import React, { createContext, useContext, useEffect, useState } from "react";
import api, { setAuthToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const t = localStorage.getItem("token");
      const userInfo = localStorage.getItem("user");
      if (t) {
        setAuthToken(t);
        setTokenState(t);
      }
      if (userInfo) {
        setUser(JSON.parse(userInfo));
      }
    } catch (e) {
      console.error("Error loading auth:", e);
    }
    setLoading(false);
  }, []);

  async function login(username, password) {
  try {
    const res = await api.post("/auth/login", { username, password });
    const t = res?.token || res?.accessToken;
    if (!t) throw new Error("No token returned from server");
    
    // Store token
    setAuthToken(t);
    setTokenState(t);
    localStorage.setItem("token", t);
    
    // Store user info FIRST
    const userData = { username, role: "user" };
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    
    return t;
  } catch (error) {
    throw new Error(error.message || "Login failed");
  }
}

  function logout() {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}