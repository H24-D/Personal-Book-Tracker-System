const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const booksRoutes = require("./routes/books"); // ADD THIS LINE

const app = express();

app.use(cors());
app.use(express.json());

// relaxed CSP for local dev tools (optional)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self' 'unsafe-inline' data:; " +
        "connect-src 'self' http://localhost:5000 http://localhost:5173 ws://localhost:5173; " +
        "img-src 'self' data:; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline';"
    );
    next();
  });
}

// simple request logger
app.use((req, res, next) => {
  console.log("[REQ] " + req.method + " " + req.url + " - body:", req.body || {});
  next();
});

async function start() {
  try {
    const initFn = db && typeof db.init === "function" ? db.init : null;
    if (!initFn) {
      console.error("DB init function not found. DB module keys:", Object.keys(db || {}));
      throw new Error("DB init missing from config/db.js");
    }

    await initFn();
    console.log("✅ Database initialized");
  } catch (err) {
    console.error("❌ DB init error:", err && err.stack ? err.stack : err);
    process.exit(1);
  }

  // mount routes after DB ready
  app.use("/api/auth", authRoutes);
  app.use("/api/books", booksRoutes); // ADD THIS LINE
  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.get("/", (req, res) => res.send("📚 Personal Book Tracker API running"));

  // global error handler
  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err && err.stack ? err.stack : err);
    const status = err && err.status ? err.status : 500;
    const message = process.env.NODE_ENV === "production" ? "Server error" : (err && err.message) || "Server error";
    res.status(status).json({ message });
  });

  // try to bind to preferred port, fallback if in use
  const preferred = Number(process.env.PORT || 5000);
  const maxTries = 10;
  let server;
  for (let i = 0; i < maxTries; i++) {
    const port = preferred + i;
    try {
      server = await new Promise((resolve, reject) => {
        const s = app.listen(port, () => resolve(s));
        s.on("error", (err) => reject(err));
      });
      console.log("🚀 Server listening on http://localhost:" + port);
      break;
    } catch (err) {
      if (err && err.code === "EADDRINUSE") {
        console.warn(`Port ${preferred + i} in use, trying ${preferred + i + 1}...`);
        continue;
      }
      console.error("Listen error:", err && err.stack ? err.stack : err);
      process.exit(1);
    }
  }

  if (!server) {
    console.error(`Unable to bind to any port in range ${preferred}..${preferred + maxTries - 1}`);
    process.exit(1);
  }

  // graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    try {
      server.close(() => console.log("HTTP server closed."));
      if (db && typeof db.getPool === "function") {
        try {
          const pool = db.getPool();
          await pool.end();
          console.log("DB pool closed.");
        } catch (e) {
          console.warn("Error closing DB pool:", e && e.message ? e.message : e);
        }
      }
      process.exit(0);
    } catch (e) {
      console.error("Shutdown error:", e && e.stack ? e.stack : e);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason && reason.stack ? reason.stack : reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err && err.stack ? err.stack : err);
  process.exit(1);
});

start();