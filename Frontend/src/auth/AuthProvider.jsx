import React, { createContext, useContext, useEffect, useState } from "react";
import api, { setAuthToken } from "../api";

const AuthContext = createContext(null);

// ── Check if JWT token is expired ──
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return true;
  }
}

// ── Get ms until token expires ──
function msUntilExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 - Date.now();
  } catch {
    return 0;
  }
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Logout helper ──
  function logout() {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");
  }

  // ── On app load: restore session OR clear if expired ──
  useEffect(() => {
    try {
      const t = localStorage.getItem("token");
      const userInfo = localStorage.getItem("user");

      if (t) {
        if (isTokenExpired(t)) {
          // Token expired → clear everything → user will see login page
          console.log("[Auth] Token expired on load — clearing session");
          logout();
        } else {
          setAuthToken(t);
          setTokenState(t);
          if (userInfo) {
            setUser(JSON.parse(userInfo));
          }
        }
      }
    } catch (e) {
      console.error("Error restoring auth:", e);
      logout();
    }
    setLoading(false);
  }, []);

  // ── Auto-logout timer: fires exactly when token expires ──
  useEffect(() => {
    if (!token) return;

    const ms = msUntilExpiry(token);

    if (ms <= 0) {
      logout();
      return;
    }

    console.log(
      `[Auth] Auto-logout scheduled in ${Math.round(ms / 1000 / 60 / 60)} hours`
    );

    const timer = setTimeout(() => {
      console.log("[Auth] Token expired — auto logout triggered");
      logout();
    }, ms);

    return () => clearTimeout(timer);
  }, [token]);

  // ── Login ──
  async function login(username, password) {
    try {
      const res = await api.post("/auth/login", { username, password });
      const t = res?.token || res?.accessToken;
      if (!t) throw new Error("No token returned from server");

      setAuthToken(t);
      setTokenState(t);
      localStorage.setItem("token", t);
      localStorage.setItem("loginTime", Date.now().toString());

      const userData = { username, role: "user" };
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      return t;
    } catch (error) {
      throw new Error(error.message || "Login failed");
    }
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
