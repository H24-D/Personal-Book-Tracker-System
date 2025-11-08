const mysql = require("mysql2/promise");
require("dotenv").config();

async function resetUser() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "booktracker"
  });

  await conn.query("DELETE FROM users WHERE username = 'alice'");
  await conn.query("INSERT INTO users (username, password) VALUES ('alice', 'pass')");
  
  console.log("✅ User reset successfully!");
  await conn.end();
}

resetUser();