// ============================================================
//  CampusEats — routes/auth.js
//  POST /api/auth/login
//  POST /api/auth/register  (student self-registration)
//  GET  /api/auth/me
// ============================================================

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { stmt } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const SECRET     = process.env.JWT_SECRET     || 'fallback_dev_secret';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function signToken(user) {
  return jwt.sign(
    { id: user.id, roll: user.roll, name: user.name, type: user.type, email: user.email },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

/* ── POST /api/auth/login ── */
router.post('/login', (req, res) => {
  const { roll, password } = req.body;

  if (!roll || !password) {
    return res.status(400).json({ error: 'Roll number and password are required.' });
  }

  const user = stmt.getUserByRoll.get(roll.trim());

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials. Please check your roll number and password.' });
  }

  const token = signToken(user);
  return res.json({
    token,
    user: { id: user.id, roll: user.roll, name: user.name, email: user.email, type: user.type },
  });
});

/* ── POST /api/auth/register (student self-registration) ── */
router.post('/register', (req, res) => {
  const { roll, name, email, password } = req.body;

  if (!roll || !name || !password) {
    return res.status(400).json({ error: 'Roll number, name, and password are required.' });
  }

  const existing = stmt.getUserByRoll.get(roll.trim());
  if (existing) {
    return res.status(409).json({ error: 'This roll number is already registered.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  try {
    stmt.insertUser.run(roll.trim(), name.trim(), email?.trim() || null, hash, 'student');
    const user  = stmt.getUserByRoll.get(roll.trim());
    const token = signToken(user);
    return res.status(201).json({
      token,
      user: { id: user.id, roll: user.roll, name: user.name, email: user.email, type: user.type },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/* ── GET /api/auth/me ── */
router.get('/me', requireAuth, (req, res) => {
  const user = stmt.getUserById.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({
    id: user.id, roll: user.roll, name: user.name, email: user.email, type: user.type,
  });
});

module.exports = router;
