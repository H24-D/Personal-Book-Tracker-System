const mysql = require("mysql2/promise");
require("dotenv").config();

const {
  MYSQL_HOST = "localhost",
  MYSQL_PORT = 3306,
  MYSQL_USER = "root",
  MYSQL_PASSWORD = "",
  MYSQL_DATABASE = "booktracker",
  SKIP_DB_CREATE = "false",
} = process.env;

let pool = null;

async function ensureDatabaseExists() {
  if (SKIP_DB_CREATE === "true") return;
  let conn;
  try {
    conn = await mysql.createConnection({
      host: MYSQL_HOST,
      port: Number(MYSQL_PORT),
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
    });
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`
    );
  } finally {
    if (conn) await conn.end();
  }
}

async function init() {
  if (pool) return;
  await ensureDatabaseExists();

  pool = mysql.createPool({
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT),
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const conn = await pool.getConnection();
  try {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        mobile VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await conn.query(createUsersTable);

    const createBooksTable = `
      CREATE TABLE IF NOT EXISTS books (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        status ENUM('to-read', 'reading', 'read') DEFAULT 'to-read',
        review TEXT,
        favorite BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await conn.query(createBooksTable);
    
    console.log("✅ Tables created/verified successfully");
  } finally {
    conn.release();
  }
}

function getPool() {
  if (!pool) throw new Error("DB pool not initialized. Call init() first.");
  return pool;
}

async function getUserByUsername(username) {
  const p = getPool();
  const [rows] = await p.query(
    "SELECT id, username, first_name, last_name, email, mobile, password FROM users WHERE username = ? LIMIT 1",
    [username]
  );
  return rows[0] || null;
}

async function createUser(username, hashedPassword, firstName, lastName, email, mobile) {
  const p = getPool();
  const [result] = await p.query(
    "INSERT INTO users (username, password, first_name, last_name, email, mobile) VALUES (?, ?, ?, ?, ?, ?)",
    [username, hashedPassword, firstName, lastName, email, mobile]
  );
  return { id: result.insertId, username, firstName, lastName, email, mobile };
}

module.exports = {
  init,
  getPool,
  getUserByUsername,
  createUser,
};