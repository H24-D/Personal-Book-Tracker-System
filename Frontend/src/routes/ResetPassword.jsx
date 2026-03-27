import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import "./ResetPassword.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(null); // null=checking, true=valid, false=invalid

  // Verify token on page load
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
    fetch(`${API_BASE}/auth/verify-reset-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => setTokenValid(data.valid === true))
      .catch(() => setTokenValid(false));
  }, [token]);

  function validatePassword(password) {
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[a-zA-Z]/.test(password)) return "Password must contain at least one letter.";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
      return "Password must contain at least one special character.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const pwError = validatePassword(password);
    if (pwError) { setError(pwError); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to reset password. Please try again.");
      } else {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  // ── Loading state (verifying token) ──
  if (tokenValid === null) {
    return (
      <div className="rp-wrapper">
        <div className="rp-box">
          <div className="rp-checking">
            <div className="rp-spinner"></div>
            <p>Verifying your reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Invalid / expired token ──
  if (tokenValid === false) {
    return (
      <div className="rp-wrapper">
        <div className="rp-box">
          <div className="rp-icon">❌</div>
          <h2 className="rp-title">Link Expired or Invalid</h2>
          <p className="rp-subtitle">
            This password reset link is invalid or has already expired.
            Reset links are only valid for 1 hour.
          </p>
          <Link to="/login" className="rp-button">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // ── Success state ──
  if (success) {
    return (
      <div className="rp-wrapper">
        <div className="rp-box">
          <div className="rp-icon">✅</div>
          <h2 className="rp-title">Password Reset!</h2>
          <p className="rp-subtitle">
            Your password has been updated successfully.
            Redirecting you to the login page...
          </p>
          <Link to="/login" className="rp-button">
            Sign In Now
          </Link>
        </div>
      </div>
    );
  }

  // ── Reset form ──
  return (
    <div className="rp-wrapper">
      <div className="rp-box">
        <div className="rp-icon">🔐</div>
        <h2 className="rp-title">Set New Password</h2>
        <p className="rp-subtitle">
          Choose a strong password for your account.
        </p>

        <form onSubmit={handleSubmit} className="rp-form">
          {error && (
            <div className="rp-alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="rp-field">
            <label htmlFor="rp-password">New Password</label>
            <input
              id="rp-password"
              type="password"
              placeholder="Min 8 chars, letter, number, special"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="rp-field">
            <label htmlFor="rp-confirm">Confirm Password</label>
            <input
              id="rp-confirm"
              type="password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="rp-button" disabled={loading}>
            {loading ? (
              <>
                <span className="rp-spinner-sm"></span>
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </button>
        </form>

        <Link to="/login" className="rp-back-link">← Back to Sign In</Link>
      </div>
    </div>
  );
}