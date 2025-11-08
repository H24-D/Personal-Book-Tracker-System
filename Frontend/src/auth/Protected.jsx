import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

function Protected({ children }) {
  const { token, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;;
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export default Protected;