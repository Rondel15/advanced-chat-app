const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { userQueries } = require('./db');

const router = express.Router();

/**
 * POST /auth/register
 * Body: { username, password }
 *
 * - Hashes the password with bcrypt (cost factor 10)
 * - Saves user to DB
 * - Returns a JWT token so the user is immediately logged in
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // --- Input validation ---
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // --- Check if username is taken ---
    const existing = userQueries.findByUsername.get(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // --- Hash password ---
    // bcrypt.hash is async — never store plain text passwords.
    // Cost factor 10 = ~100ms per hash, good balance of security vs speed.
    const hashedPassword = await bcrypt.hash(password, 10);

    // --- Save to DB ---
    const result = userQueries.create.run(username, hashedPassword);

    // --- Issue JWT ---
    const token = jwt.sign(
      { id: result.lastInsertRowid, username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, username });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/login
 * Body: { username, password }
 *
 * - Looks up user by username
 * - Compares password with bcrypt
 * - Returns a fresh JWT token
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // --- Find user ---
    const user = userQueries.findByUsername.get(username);
    if (!user) {
      // Use a generic message — don't reveal whether username exists
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // --- Compare password ---
    // bcrypt.compare is async and timing-safe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // --- Issue JWT ---
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, username: user.username });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
