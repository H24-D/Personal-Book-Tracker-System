const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

async function hashExistingPasswords() {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "booktracker"
  });

  // Get all users
  const [users] = await conn.query("SELECT id, username, password FROM users");
  
  for (const user of users) {
    // Hash the plain text password
    const hashed = await bcrypt.hash(user.password, 10);
    
    // Update the user with hashed password
    await conn.query("UPDATE users SET password = ? WHERE id = ?", [hashed, user.id]);
    console.log(`Updated password for user: ${user.username}`);
  }
  
  await conn.end();
  console.log("All passwords hashed!");
}

hashExistingPasswords();