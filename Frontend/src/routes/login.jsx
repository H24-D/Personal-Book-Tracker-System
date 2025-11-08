import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import "./login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state && location.state.from) || "/books";

  // Navigate when user is set
  useEffect(() => {
    if (user) {
      console.log("User set to:", user);
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  function getErrorMessage(err) {
    const message = err.message || "Login failed";
    
    if (message.includes("invalid credentials")) {
      return "Username or password is incorrect. Please try again.";
    }
    if (message.includes("already exists")) {
      return "This username already exists. Try logging in instead.";
    }
    if (message.includes("required")) {
      return "Please fill in all fields.";
    }
    if (message.includes("network")) {
      return "Network error. Please check your connection.";
    }
    return message;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      // Don't navigate here - let the useEffect handle it
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <div className="login-content">
          <div className="login-header">
            <div className="logo">📚</div>
            <h1>Personal Book Tracker</h1>
            <p className="tagline">Organize and manage your reading journey</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <h2>Welcome Back</h2>
            <p className="form-subtitle">Sign in to continue to your library</p>

            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">ℹ️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="form-input"
                required
              />
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="form-footer">
            <p>
              Don't have an account?{" "}
              <Link to="/register" className="link">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}