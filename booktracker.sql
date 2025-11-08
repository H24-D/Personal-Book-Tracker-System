CREATE DATABASE booktracker;-- 
USE booktracker;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);
SELECT id, username, password FROM users;
ALTER TABLE users 
ADD COLUMN first_name VARCHAR(255) AFTER username,
ADD COLUMN last_name VARCHAR(255) AFTER first_name,
ADD COLUMN email VARCHAR(255) UNIQUE AFTER last_name,
ADD COLUMN mobile VARCHAR(10) AFTER email,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER mobile;
DESCRIBE users;
SELECT * FROM users;

--    CREATE TABLE IF NOT EXISTS books (
--      id INT AUTO_INCREMENT PRIMARY KEY,
--      user_id INT NOT NULL,
--      title VARCHAR(255) NOT NULL,
--      author VARCHAR(255) NOT NULL,
--      status ENUM('to-read', 'reading', 'completed') DEFAULT 'to-read',
--      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
--    );
DELETE FROM users WHERE email = 'd2876379@gmail.com'
