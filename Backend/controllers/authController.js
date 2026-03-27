const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const https = require("https");
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

// ── Brevo HTTP API helper (no SMTP, works on Render free tier) ──
function sendBrevoEmail({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      sender: { name: "Book Tracker", email: process.env.MAIL_FROM },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });

    const options = {
      hostname: "api.brevo.com",
      path: "/v3/smtp/email",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Brevo API error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ── Ensure password_reset_tokens table exists ──
async function ensureTokenTable(pool) {
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
}

async function login(req, res, next) {
  try {
    console.log("[DEBUG] /api/auth/login body:", req.body);

    if (typeof db.getUserByUsername !== "function") {
      console.error("DB helper getUserByUsername missing.");
      return res.status(500).json({ message: "Server misconfiguration (DB helper missing)" });
    }

    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: "username and password required" });
    }

    const user = await db.getUserByUsername(username);
    if (!user) return res.status(401).json({ message: "invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
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
      if (err.message.includes("email")) return res.status(409).json({ message: "This email is already registered" });
      if (err.message.includes("username")) return res.status(409).json({ message: "Username already exists" });
      return res.status(409).json({ message: "This account already exists" });
    }

    res.status(500).json({ message: process.env.NODE_ENV === "production" ? "Server error" : (err.message || "Server error") });
  }
}

// ── FORGOT PASSWORD ──
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

    const pool = db.getPool();
    await ensureTokenTable(pool);

    const [rows] = await pool.query(
      "SELECT id, email FROM users WHERE LOWER(email) = ? LIMIT 1",
      [normalizedEmail]
    );

    if (!rows || rows.length === 0) {
      console.log(`[ForgotPassword] Email not found (silent): ${normalizedEmail}`);
      return res.json({ message: "If that email is registered, a reset link has been sent." });
    }

    const user = rows[0];

    await pool.query(
      "UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0",
      [user.id]
    );

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, token, expiresAt]
    );

    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

    await sendBrevoEmail({
      to: normalizedEmail,
      subject: "Reset your Book Tracker password",
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                    max-width:480px;margin:0 auto;background:#09090b;
                    border:1px solid #27272a;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">📚</div>
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Book Tracker</h1>
          </div>
          <div style="padding:36px 32px;">
            <h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Reset your password</h2>
            <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 28px;">
              Click the button below to reset your password.
              This link expires in <strong style="color:#e4e4e7;">1 hour</strong>.
            </p>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${resetLink}"
                 style="display:inline-block;padding:14px 32px;
                        background:linear-gradient(135deg,#0ea5e9,#0284c7);
                        color:#fff;text-decoration:none;font-weight:700;
                        font-size:16px;border-radius:10px;">
                Reset Password
              </a>
            </div>
            <p style="color:#71717a;font-size:13px;margin:0 0 8px;">Or copy this link:</p>
            <p style="word-break:break-all;margin:0 0 24px;">
              <a href="${resetLink}" style="color:#0ea5e9;font-size:13px;">${resetLink}</a>
            </p>
            <hr style="border:none;border-top:1px solid #27272a;margin:0 0 20px;" />
            <p style="color:#52525b;font-size:13px;margin:0;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
          <div style="padding:20px 32px;background:#18181b;text-align:center;">
            <p style="color:#52525b;font-size:12px;margin:0;">
              © ${new Date().getFullYear()} Personal Book Tracker
            </p>
          </div>
        </div>
      `,
    });

    console.log(`[ForgotPassword] Reset email sent via Brevo to: ${normalizedEmail}`);
    return res.json({ message: "If that email is registered, a reset link has been sent." });

  } catch (err) {
    console.error("ForgotPassword error:", err && err.stack ? err.stack : err);
    res.status(500).json({ message: process.env.NODE_ENV === "production" ? "Server error" : (err.message || "Server error") });
  }
}

// ── VERIFY RESET TOKEN ──
async function verifyResetToken(req, res) {
  try {
    const { token } = req.body || {};
    if (!token) return res.json({ valid: false });

    const pool = db.getPool();
    await ensureTokenTable(pool);

    const [rows] = await pool.query(
      "SELECT id, expires_at, used FROM password_reset_tokens WHERE token = ? LIMIT 1",
      [token]
    );

    if (!rows || rows.length === 0) return res.json({ valid: false });

    const row = rows[0];
    const now = new Date();
    const expired = new Date(row.expires_at) < now;

    if (row.used || expired) return res.json({ valid: false });

    return res.json({ valid: true });
  } catch (err) {
    console.error("VerifyResetToken error:", err);
    res.json({ valid: false });
  }
}

// ── RESET PASSWORD ──
async function resetPassword(req, res) {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    const pool = db.getPool();
    await ensureTokenTable(pool);

    const [rows] = await pool.query(
      "SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = ? LIMIT 1",
      [token]
    );

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired reset link." });
    }

    const row = rows[0];
    const expired = new Date(row.expires_at) < new Date();

    if (row.used || expired) {
      return res.status(400).json({ message: "This reset link has already been used or has expired." });
    }

    // ── Update password ──
    const hashed = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashed, row.user_id]);

    // ── Mark token as used ──
    await pool.query("UPDATE password_reset_tokens SET used = 1 WHERE id = ?", [row.id]);

    console.log(`[ResetPassword] Password updated for user_id: ${row.user_id}`);
    return res.json({ message: "Password updated successfully." });

  } catch (err) {
    console.error("ResetPassword error:", err && err.stack ? err.stack : err);
    res.status(500).json({ message: process.env.NODE_ENV === "production" ? "Server error" : (err.message || "Server error") });
  }
}

// ── Book handlers ──
async function getBooks(req, res) {
  try {
    const userId = req.user.sub;
    const pool = db.getPool();
    const [books] = await pool.query("SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC", [userId]);
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
    const [books] = await pool.query("SELECT * FROM books WHERE id = ? AND user_id = ?", [bookId, userId]);
    if (books.length === 0) return res.status(404).json({ message: "Book not found" });
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
    if (!title || !author) return res.status(400).json({ message: "Title and author required" });

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
    const [existing] = await pool.query("SELECT * FROM books WHERE id = ? AND user_id = ?", [bookId, userId]);
    if (existing.length === 0) return res.status(404).json({ message: "Book not found" });

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
    const [result] = await pool.query("DELETE FROM books WHERE id = ? AND user_id = ?", [bookId, userId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Book not found" });
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
  verifyResetToken,
  resetPassword,
  validatePassword,
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
};