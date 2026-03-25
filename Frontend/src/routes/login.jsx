import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import "./login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state && location.state.from) || "/books";

  // ── Forgot Password State ──
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const [justLoggedIn, setJustLoggedIn] = useState(false);

  useEffect(() => {
    if (user && justLoggedIn) {
      navigate(from, { replace: true });
    }
  }, [user, justLoggedIn, navigate, from]);

  // Close modal on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") closeForgotModal();
    }
    if (showForgotModal) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showForgotModal]);

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
      setJustLoggedIn(true);
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  // ── Forgot Password Handlers ──
  function openForgotModal() {
    setForgotEmail("");
    setForgotError("");
    setForgotSuccess(false);
    setShowForgotModal(true);
  }

  function closeForgotModal() {
    setShowForgotModal(false);
    setForgotEmail("");
    setForgotError("");
    setForgotSuccess(false);
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setForgotError("");

    if (!forgotEmail.trim()) {
      setForgotError("Please enter your email address.");
      return;
    }
    if (!forgotEmail.toLowerCase().endsWith("@gmail.com")) {
      setForgotError("Please enter a valid @gmail.com address.");
      return;
    }

    setForgotLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.message || "Something went wrong. Please try again.");
      } else {
        setForgotSuccess(true);
      }
    } catch (err) {
      setForgotError("Network error. Please check your connection and try again.");
    } finally {
      setForgotLoading(false);
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

          {isAuthenticated && (
            <div className="alert" style={{
              background: "rgba(59, 130, 246, 0.15)",
              color: "#93c5fd",
              border: "1px solid rgba(59, 130, 246, 0.35)",
              marginBottom: "1rem",
            }}>
              <span className="alert-icon">ℹ️</span>
              <span>
                You are already logged in as <strong>{user?.username}</strong>.{" "}
                <button
                  onClick={() => navigate("/books")}
                  style={{
                    background: "none", border: "none", color: "#60a5fa",
                    textDecoration: "underline", cursor: "pointer",
                    padding: 0, font: "inherit",
                  }}
                >
                  Go to My Books
                </button>
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <h2>Welcome Back</h2>
            <p className="form-subtitle">Sign in to continue to your library</p>

            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">⚠️</span>
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
              {/* ── Forgot Password Link (sits below password field) ── */}
              <div className="forgot-password-row">
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={openForgotModal}
                >
                  Forgot password?
                </button>
              </div>
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
              <Link to="/register" className="link">Create one</Link>
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          Forgot Password Modal
      ══════════════════════════════════ */}
      {showForgotModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closeForgotModal(); }}
        >
          <div
            className="modal-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-title"
          >
            <button
              className="modal-close-btn"
              onClick={closeForgotModal}
              aria-label="Close modal"
            >
              ✕
            </button>

            {!forgotSuccess ? (
              /* ── Step 1: Enter Email ── */
              <>
                <div className="modal-icon">🔑</div>
                <h3 id="forgot-title" className="modal-title">Forgot Password?</h3>
                <p className="modal-subtitle">
                  Enter your registered Gmail address and we'll send you a password reset link.
                </p>

                <form onSubmit={handleForgotSubmit} className="modal-form">
                  {forgotError && (
                    <div className="alert alert-error modal-alert">
                      <span className="alert-icon">⚠️</span>
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="forgot-email">Email Address</label>
                    <input
                      id="forgot-email"
                      type="email"
                      placeholder="example@gmail.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={forgotLoading}
                      className="form-input"
                      autoFocus
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="login-button modal-submit-btn"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <>
                        <span className="spinner"></span>
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </button>
                </form>

                <button
                  type="button"
                  className="modal-back-link"
                  onClick={closeForgotModal}
                >
                  ← Back to Sign In
                </button>
              </>
            ) : (
              /* ── Step 2: Success ── */
              <div className="modal-success">
                <div className="success-icon">✅</div>
                <h3 className="modal-title">Check Your Email</h3>
                <p className="modal-subtitle">
                  If <strong>{forgotEmail}</strong> is registered, you'll receive a
                  password reset link shortly.
                </p>
                <p className="modal-hint">
                  Didn't receive it? Check your spam folder or try again.
                </p>
                <button
                  className="login-button modal-submit-btn"
                  onClick={closeForgotModal}
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
