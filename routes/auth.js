const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !user.is_active) return res.status(401).json({ message: 'Invalid email or password.' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ message: 'Invalid email or password.' });

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'cmpms_super_secret_change_me', {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  logAction({ user: payload, action: 'LOGIN', entityType: 'user', entityId: user.id });

  res.json({ token, user: payload });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
