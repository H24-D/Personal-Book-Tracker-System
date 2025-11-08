const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET in .env");
  process.exit(1);
}

function validatePassword(password) {
  // Minimum 8 characters
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }

  // Must contain at least one letter (a-z or A-Z)
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one letter" };
  }

  // Must contain at least one number (0-9)
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }

  // Must contain at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: "Password must contain at least one special character" };
  }

  return { valid: true, message: "Valid password" };
}

async function login(req, res, next) {
  try {
    console.log("[DEBUG] /api/auth/login body:", req.body);

    if (typeof db.getUserByUsername !== "function") {
      console.error("DB helper getUserByUsername missing. DB module keys:", Object.keys(db));
      return res.status(500).json({ message: "Server misconfiguration (DB helper missing)" });
    }

    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: "username and password required" });
    }

    const user = await db.getUserByUsername(username);
    console.log("[DEBUG] DB returned user:", !!user);

    if (!user) return res.status(401).json({ message: "invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    console.log("[DEBUG] bcrypt.compare result:", ok);
    
    if (!ok) return res.status(401).json({ message: "invalid credentials" });

    const payload = { sub: user.id, username: user.username };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    console.log("[DEBUG] Token generated successfully");
    res.json({ token });
  } catch (err) {
    console.error("Login error:", err && err.stack ? err.stack : err);
    res.status(500).json({ message: process.env.NODE_ENV === "production" ? "Server error" : (err.message || "Server error") });
  }
}
async function register(req, res, next) {
  try {
    const { username, password, firstName, lastName, email, mobile } = req.body || {};
    
    if (!username || !password || !firstName || !lastName || !email || !mobile) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate username (must start with letter, can contain letters, numbers, and only # _ ! characters)
    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9#_!]*$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ message: "Username must start with a letter and can only contain letters, numbers, and # _ ! characters" });
    }

    // Validate username length
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: "Username must be between 3 and 20 characters" });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    // Validate email
    if (!email.toLowerCase().endsWith("@gmail.com")) {
      return res.status(400).json({ message: "Email must be a valid @gmail.com address" });
    }

    // Validate mobile
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({ message: "Mobile number must be exactly 10 digits" });
    }

    if (typeof db.getUserByUsername !== "function" || typeof db.createUser !== "function") {
      console.error("DB helpers are missing:", Object.keys(db));
      return res.status(500).json({ message: "Server misconfiguration (DB helpers missing)" });
    }

    const existing = await db.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await db.createUser(username, hashed, firstName, lastName, email, mobile);
    
    res.status(201).json({ 
      id: user.id, 
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile
    });
  } catch (err) {
    console.error("Register error:", err && err.stack ? err.stack : err);
    
    // Handle duplicate email error
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.message.includes('email')) {
        return res.status(409).json({ message: "This email is already registered" });
      }
      if (err.message.includes('username')) {
        return res.status(409).json({ message: "Username already exists" });
      }
      return res.status(409).json({ message: "This account already exists" });
    }
    
    res.status(500).json({ message: process.env.NODE_ENV === "production" ? "Server error" : (err.message || "Server error") });
  }
}

module.exports = { register, login, validatePassword };

