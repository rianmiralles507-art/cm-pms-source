const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');
const { updateOverduePayments } = require('../utils/statusUpdater');

const router = express.Router();
router.use(authenticate);

function nextPaymentCode() {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM payments').get();
  const year = new Date().getFullYear();
  return `PAY-${year}-${String(row.cnt + 1).padStart(4, '0')}`;
}

// List payments (with filters) — refresh overdue status first
router.get('/', (req, res) => {
  updateOverduePayments();
  const { status, contract_id, payment_type } = req.query;
  let query = `
    SELECT p.*, c.title as contract_title, c.contract_code
    FROM payments p JOIN contracts c ON c.id = p.contract_id WHERE 1=1
  `;
  const params = [];
  if (status) { query += ' AND p.status = ?'; params.push(status); }
  if (contract_id) { query += ' AND p.contract_id = ?'; params.push(contract_id); }
  if (payment_type) { query += ' AND p.payment_type = ?'; params.push(payment_type); }
  query += ' ORDER BY p.due_date ASC';

  res.json(db.prepare(query).all(...params));
});

// Create payment (Finance Officer, Admin)
router.post('/', authorize('finance_officer', 'admin'), (req, res) => {
  const { contract_id, amount, payment_type, due_date, notes } = req.body;
  if (!contract_id || !amount || !payment_type || !due_date) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(contract_id);
  if (!contract) return res.status(404).json({ message: 'Contract not found.' });

  const code = nextPaymentCode();
  const info = db.prepare(`
    INSERT INTO payments (payment_code, contract_id, amount, payment_type, due_date, notes, created_by, status)
    VALUES (?,?,?,?,?,?,?, 'Pending')
  `).run(code, contract_id, amount, payment_type, due_date, notes || null, req.user.id);

  logAction({ user: req.user, action: 'CREATE', entityType: 'payment', entityId: info.lastInsertRowid, details: { contract_id, amount, payment_type } });
  res.status(201).json({ id: info.lastInsertRowid, payment_code: code });
});

// Update payment (Finance Officer, Admin)
router.put('/:id', authorize('finance_officer', 'admin'), (req, res) => {
  const { amount, payment_type, due_date, notes } = req.body;
  db.prepare(`
    UPDATE payments SET amount=COALESCE(?,amount), payment_type=COALESCE(?,payment_type),
      due_date=COALESCE(?,due_date), notes=COALESCE(?,notes), updated_at=datetime('now')
    WHERE id=?
  `).run(amount, payment_type, due_date, notes, req.params.id);
  logAction({ user: req.user, action: 'UPDATE', entityType: 'payment', entityId: req.params.id, details: req.body });
  res.json({ message: 'Payment updated.' });
});

// Mark payment as paid (Finance Officer, Admin)
router.post('/:id/mark-paid', authorize('finance_officer', 'admin'), (req, res) => {
  const paidDate = req.body.paid_date || new Date().toISOString().slice(0, 10);
  db.prepare(`UPDATE payments SET status='Paid', paid_date=?, updated_at=datetime('now') WHERE id=?`).run(paidDate, req.params.id);
  logAction({ user: req.user, action: 'MARK_PAID', entityType: 'payment', entityId: req.params.id, details: { paid_date: paidDate } });
  res.json({ message: 'Payment marked as paid.' });
});

// Delete payment (Admin only)
router.delete('/:id', authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
  logAction({ user: req.user, action: 'DELETE', entityType: 'payment', entityId: req.params.id });
  res.json({ message: 'Payment deleted.' });
});

module.exports = router;
