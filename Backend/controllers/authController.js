const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET in .env");
  process.exit(1);
}

function validatePassword(password) {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one letter" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }
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

    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9#_!]*$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ message: "Username must start with a letter and can only contain letters, numbers, and # _ ! characters" });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: "Username must be between 3 and 20 characters" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    if (!email.toLowerCase().endsWith("@gmail.com")) {
      return res.status(400).json({ message: "Email must be a valid @gmail.com address" });
    }

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
      mobile: user.mobile,
    });
  } catch (err) {
    console.error("Register error:", err && err.stack ? err.stack : err);

    if (err.code === "ER_DUP_ENTRY") {
      if (err.message.includes("email")) {
        return res.status(409).json({ message: "This email is already registered" });
      }
      if (err.message.includes("username")) {
        return res.status(409).json({ message: "Username already exists" });
      }
      return res.status(409).json({ message: "This account already exists" });
    }

    res.status(500).json({ message: process.env.NODE_ENV === "production" ? "Server error" : (err.message || "Server error") });
  }
}

// ══════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ──────────────────────────────────────────────────────────
// How it works (no email library required):
//   1. User submits their Gmail address.
//   2. We look up the email in the DB.
//   3. If found, we generate a secure random token, store it
//      in a password_reset_tokens table (with expiry), and
//      return the reset link in the JSON response so you can
//      wire it to an email service (nodemailer, SendGrid, etc.)
//      when you're ready.
//   4. We ALWAYS return 200 so attackers can't enumerate emails.
// ══════════════════════════════════════════════════════════
async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};

    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.endsWith("@gmail.com")) {
      return res.status(400).json({ message: "Please enter a valid @gmail.com address" });
    }

    // ── Ensure the reset-token table exists ──
    const pool = db.getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id     INT UNSIGNED NOT NULL,
        token       VARCHAR(64)  NOT NULL UNIQUE,
        expires_at  DATETIME     NOT NULL,
        used        TINYINT(1)   DEFAULT 0,
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // ── Look up user by email ──
    const [rows] = await pool.query(
      "SELECT id, email FROM users WHERE LOWER(email) = ? LIMIT 1",
      [normalizedEmail]
    );

    // Always respond 200 to prevent email enumeration
    if (!rows || rows.length === 0) {
      console.log(`[ForgotPassword] Email not found (silent): ${normalizedEmail}`);
      return res.json({ message: "If that email is registered, a reset link has been sent." });
    }

    const user = rows[0];

    // ── Invalidate any existing tokens for this user ──
    await pool.query(
      "UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0",
      [user.id]
    );

    // ── Generate a secure token (expires in 1 hour) ──
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, token, expiresAt]
    );

    // ── Build the reset URL ──
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

    // ── Log for development (replace with real email sending in production) ──
    console.log("─────────────────────────────────────────");
    console.log("[ForgotPassword] Reset link generated:");
    console.log(`  Email : ${normalizedEmail}`);
    console.log(`  Link  : ${resetLink}`);
    console.log(`  Expiry: ${expiresAt.toISOString()}`);
    console.log("─────────────────────────────────────────");

    // ── TODO: Replace the console.log above with your email sender ──
    // Example with nodemailer (add to package.json: "nodemailer": "^6.x"):
    //
    // const nodemailer = require("nodemailer");
    // const transporter = nodemailer.createTransport({
    //   service: "gmail",
    //   auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
    // });
    // await transporter.sendMail({
    //   from: `"Book Tracker" <${process.env.MAIL_USER}>`,
    //   to: normalizedEmail,
    //   subject: "Reset your password",
    //   html: `<p>Click <a href="${resetLink}">here</a> to reset your password. Link expires in 1 hour.</p>`,
    // });

    return res.json({ message: "If that email is registered, a reset link has been sent." });
  } catch (err) {
    console.error("ForgotPassword error:", err && err.stack ? err.stack : err);
    res.status(500).json({ message: process.env.NODE_ENV === "production" ? "Server error" : (err.message || "Server error") });
  }
}

// ── Book handlers (unchanged) ──
async function getBooks(req, res) {
  try {
    const userId = req.user.sub;
    const pool = db.getPool();
    const [books] = await pool.query(
      "SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    res.json(books);
  } catch (err) {
    console.error("Get books error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

async function getBook(req, res) {
  try {
    const userId = req.user.sub;
    const bookId = req.params.id;
    const pool = db.getPool();
    const [books] = await pool.query(
      "SELECT * FROM books WHERE id = ? AND user_id = ?",
      [bookId, userId]
    );
    if (books.length === 0) {
      return res.status(404).json({ message: "Book not found" });
    }
    res.json(books[0]);
  } catch (err) {
    console.error("Get book error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

async function createBook(req, res) {
  try {
    const userId = req.user.sub;
    const { title, author, status, review, favorite } = req.body;

    if (!title || !author) {
      return res.status(400).json({ message: "Title and author required" });
    }

    const pool = db.getPool();
    const [result] = await pool.query(
      "INSERT INTO books (user_id, title, author, status, review, favorite) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, title, author, status || "to-read", review || "", favorite || false]
    );

    const [newBook] = await pool.query("SELECT * FROM books WHERE id = ?", [result.insertId]);
    res.status(201).json(newBook[0]);
  } catch (err) {
    console.error("Create book error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

async function updateBook(req, res) {
  try {
    const userId = req.user.sub;
    const bookId = req.params.id;
    const { title, author, status, review, favorite } = req.body;

    const pool = db.getPool();
    const [existing] = await pool.query(
      "SELECT * FROM books WHERE id = ? AND user_id = ?",
      [bookId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "Book not found" });
    }

    await pool.query(
      "UPDATE books SET title = ?, author = ?, status = ?, review = ?, favorite = ? WHERE id = ? AND user_id = ?",
      [title, author, status, review, favorite, bookId, userId]
    );

    const [updatedBook] = await pool.query("SELECT * FROM books WHERE id = ?", [bookId]);
    res.json(updatedBook[0]);
  } catch (err) {
    console.error("Update book error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

async function deleteBook(req, res) {
  try {
    const userId = req.user.sub;
    const bookId = req.params.id;

    const pool = db.getPool();
    const [result] = await pool.query(
      "DELETE FROM books WHERE id = ? AND user_id = ?",
      [bookId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json({ message: "Book deleted" });
  } catch (err) {
    console.error("Delete book error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  validatePassword,
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
};
