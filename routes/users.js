const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

const ROLES = ['admin', 'finance_officer', 'approver', 'encoder'];

// List users (Admin only)
router.get('/', authorize('admin'), (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

// Create user (Admin only)
router.post('/', authorize('admin'), (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ message: 'All fields are required.' });
  if (!ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role.' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ message: 'A user with this email already exists.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)')
    .run(name, email.toLowerCase().trim(), hash, role);

  logAction({ user: req.user, action: 'CREATE', entityType: 'user', entityId: info.lastInsertRowid, details: { name, email, role } });
  res.status(201).json({ id: info.lastInsertRowid });
});

// Update user (Admin only)
router.put('/:id', authorize('admin'), (req, res) => {
  const { name, role, is_active, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  db.prepare('UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role), is_active = COALESCE(?, is_active) WHERE id = ?')
    .run(name, role, is_active === undefined ? undefined : (is_active ? 1 : 0), req.params.id);

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  }

  logAction({ user: req.user, action: 'UPDATE', entityType: 'user', entityId: req.params.id, details: req.body });
  res.json({ message: 'User updated.' });
});

// Delete (deactivate) user (Admin only)
router.delete('/:id', authorize('admin'), (req, res) => {
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(req.params.id);
  logAction({ user: req.user, action: 'DEACTIVATE', entityType: 'user', entityId: req.params.id });
  res.json({ message: 'User deactivated.' });
});

// Simple list of approvers for assigning workflow steps (any authenticated user)
router.get('/approvers/list', (req, res) => {
  const rows = db.prepare("SELECT id, name, role FROM users WHERE role IN ('approver','finance_officer','admin') AND is_active = 1").all();
  res.json(rows);
});

module.exports = router;
