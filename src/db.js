const Database = require('better-sqlite3');
const path = require('path');

// Creates (or opens) a file-based SQLite database
// No config needed — just a .db file on disk
const db = new Database(path.join(__dirname, '../chat.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// --- Schema Setup ---
// Runs once on startup. IF NOT EXISTS means it's safe to re-run.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT    UNIQUE NOT NULL,
    password  TEXT    NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    room       TEXT    NOT NULL,
    username   TEXT    NOT NULL,
    content    TEXT    NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- Query Helpers ---
// better-sqlite3 is synchronous by design — no async/await needed here.
// This is intentional: SQLite is fast enough that blocking is fine for
// lightweight ops like these.

const userQueries = {
  findByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  create: db.prepare('INSERT INTO users (username, password) VALUES (?, ?)'),
};

const messageQueries = {
  // Save a new message to a room
  save: db.prepare(
    'INSERT INTO messages (room, username, content) VALUES (?, ?, ?)'
  ),
  // Fetch the last 50 messages for a room, oldest first
  getByRoom: db.prepare(
    'SELECT username, content, created_at FROM messages WHERE room = ? ORDER BY created_at DESC LIMIT 50'
  ),
};

module.exports = { userQueries, messageQueries };
