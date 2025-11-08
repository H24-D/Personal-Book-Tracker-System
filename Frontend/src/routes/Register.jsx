import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import "./Register.css";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function validateUsername(username) {
  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9#_!]*$/;
  return usernameRegex.test(username) && username.length >= 3 && username.length <= 20;
}

function validatePassword(password) {
  // Minimum 8 characters
  if (password.length < 8) {
    return false;
  }

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return false;
  }

  // Must contain at least one number
  if (!/[0-9]/.test(password)) {
    return false;
  }

  // Must contain at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return false;
  }

  return true;
}

  function validateEmail(email) {
    return email.toLowerCase().endsWith("@gmail.com");
  }

  function validateMobile(mobile) {
    const mobileRegex = /^\d{10}$/;
    return mobileRegex.test(mobile);
  }

  async function handleSubmit(e) {
  e.preventDefault();
  setError("");

  if (!validateUsername(formData.username)) {
    setError("Username must start with a letter, be 3-20 characters long, and can only contain letters, numbers, and # _ ! characters.");
    return;
  }
  if (!validatePassword(formData.password)) {
    setError("Password must be at least 8 characters long and contain at least one letter, one number, and one special character.");
    return;
  }

  if (formData.password !== formData.confirmPassword) {
    setError("Passwords do not match.");
    return;
  }
  if (!validateEmail(formData.email)) {
    setError("Email must be a valid @gmail.com address.");
    return;
  }

  // Validate mobile
  if (!validateMobile(formData.mobile)) {
    setError("Mobile number must be exactly 10 digits.");
    return;
  }
  // ... all your validations ...

  setLoading(true);

  try {
    await api.post("/auth/register", {
      username: formData.username,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      mobile: formData.mobile,
      password: formData.password
    });
    alert("Registration successful! Please login.");
    navigate("/login");
  } catch (err) {
    // Friendly error messages
    if (err.message.includes("already exists") || err.message.includes("username")) {
      setError("This username is already taken. Please choose a different one.");
    } else if (err.message.includes("already registered") || err.message.includes("email")) {
      setError("This email is already registered. Try logging in instead.");
    } else {
      setError(err.message || "Registration failed");
    }
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="register-container">
      <div className="register-box">
        <h1 className="register-title">Create Account</h1>
        <p className="register-subtitle">Register for Personal Book Tracker</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label className="form-label">Username *</label>
            <input
              type="text"
              name="username"
              placeholder="Enter your username"
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group-half">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                name="firstName"
                placeholder="Enter first name"
                value={formData.firstName}
                onChange={handleChange}
                disabled={loading}
                className="form-input"
              />
            </div>

            <div className="form-group-half">
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                name="lastName"
                placeholder="Enter last name"
                value={formData.lastName}
                onChange={handleChange}
                disabled={loading}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email"
              name="email"
              placeholder="example@gmail.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mobile Number *</label>
            <input
              type="tel"
              name="mobile"
              placeholder="10 digit mobile number"
              value={formData.mobile}
              onChange={handleChange}
              disabled={loading}
              className="form-input"
              maxLength="10"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              type="password"
              name="password"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password *</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              className="form-input"
            />
          </div>

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        <p className="register-footer">
          Already have an account? <Link to="/login" className="register-link">Login here</Link>
        </p>
      </div>
    </div>
  );
}