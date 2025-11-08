const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

// Middleware function to check authentication
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "no token" });
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "invalid token" });
  }
}

// Apply authentication middleware to all book routes
router.use(requireAuth);

// Get all books for logged-in user
router.get("/", async (req, res) => {
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
});

// Get single book
router.get("/:id", async (req, res) => {
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
});

// Create book
router.post("/", async (req, res) => {
  try {
    const userId = req.user.sub;
    const { title, author, status } = req.body;
    
    if (!title || !author) {
      return res.status(400).json({ message: "Title and author required" });
    }

    const pool = db.getPool();
    const [result] = await pool.query(
      "INSERT INTO books (user_id, title, author, status) VALUES (?, ?, ?, ?)",
      [userId, title, author, status || "to-read"]
    );
    res.status(201).json({ 
      id: result.insertId, 
      title, 
      author, 
      status: status || "to-read" 
    });
  } catch (err) {
    console.error("Create book error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update book
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user.sub;
    const bookId = req.params.id;
    const { title, author, status } = req.body;

    const pool = db.getPool();
    await pool.query(
      "UPDATE books SET title = ?, author = ?, status = ? WHERE id = ? AND user_id = ?",
      [title, author, status, bookId, userId]
    );
    res.json({ message: "Book updated" });
  } catch (err) {
    console.error("Update book error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete book
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.sub;
    const bookId = req.params.id;
    
    const pool = db.getPool();
    await pool.query(
      "DELETE FROM books WHERE id = ? AND user_id = ?",
      [bookId, userId]
    );
    res.json({ message: "Book deleted" });
  } catch (err) {
    console.error("Delete book error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;