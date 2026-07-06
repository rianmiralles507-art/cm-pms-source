const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.pdf', '.docx', '.doc'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only PDF and DOCX files are allowed.'), ok);
  },
});

function nextContractCode() {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM contracts').get();
  const year = new Date().getFullYear();
  return `CTR-${year}-${String(row.cnt + 1).padStart(4, '0')}`;
}

const APPROVAL_STEPS = [
  { order: 1, name: 'Department Head', role: 'approver' },
  { order: 2, name: 'Finance', role: 'finance_officer' },
  { order: 3, name: 'Admin', role: 'admin' },
];

// List / search / filter contracts
router.get('/', (req, res) => {
  const { search, status } = req.query;
  let query = 'SELECT * FROM contracts WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (title LIKE ? OR client_name LIKE ? OR contract_code LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC';

  const contracts = db.prepare(query).all(...params);

  // attach payment totals for quick balance view
  const paidStmt = db.prepare("SELECT COALESCE(SUM(amount),0) as paid FROM payments WHERE contract_id = ? AND status = 'Paid'");
  const withBalance = contracts.map((c) => {
    const paid = paidStmt.get(c.id).paid;
    return { ...c, paid_amount: paid, balance: c.total_value - paid };
  });

  res.json(withBalance);
});

// Get single contract with approvals + payments
router.get('/:id', (req, res) => {
  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!contract) return res.status(404).json({ message: 'Contract not found.' });

  const approvals = db.prepare('SELECT a.*, u.name as acted_by_name FROM approvals a LEFT JOIN users u ON u.id = a.acted_by WHERE contract_id = ? ORDER BY step_order').all(req.params.id);
  const payments = db.prepare('SELECT * FROM payments WHERE contract_id = ? ORDER BY due_date').all(req.params.id);
  const paid = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);

  res.json({ ...contract, approvals, payments, paid_amount: paid, balance: contract.total_value - paid });
});

// Create contract (Encoder, Admin)
router.post('/', authorize('encoder', 'admin'), upload.single('document'), (req, res) => {
  const { title, client_name, start_date, end_date, total_value, description } = req.body;
  if (!title || !client_name || !start_date || !end_date || !total_value) {
    return res.status(400).json({ message: 'Please complete all required fields.' });
  }

  const code = nextContractCode();
  const info = db.prepare(`
    INSERT INTO contracts (contract_code, title, client_name, start_date, end_date, total_value, description, file_path, file_name, created_by, status)
    VALUES (?,?,?,?,?,?,?,?,?,?, 'Draft')
  `).run(code, title, client_name, start_date, end_date, total_value, description || null,
    req.file ? req.file.filename : null, req.file ? req.file.originalname : null, req.user.id);

  const contractId = info.lastInsertRowid;

  const insertStep = db.prepare(`INSERT INTO approvals (contract_id, step_order, step_name, required_role, status) VALUES (?,?,?,?,?)`);
  APPROVAL_STEPS.forEach((s, idx) => {
    insertStep.run(contractId, s.order, s.name, s.role, idx === 0 ? 'Pending' : 'Pending');
  });

  logAction({ user: req.user, action: 'CREATE', entityType: 'contract', entityId: contractId, details: { title, client_name, total_value } });
  res.status(201).json({ id: contractId, contract_code: code });
});

// Update contract (Encoder, Admin) — only while Draft
router.put('/:id', authorize('encoder', 'admin'), upload.single('document'), (req, res) => {
  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!contract) return res.status(404).json({ message: 'Contract not found.' });
  if (contract.status !== 'Draft' && req.user.role !== 'admin') {
    return res.status(400).json({ message: 'Only draft contracts can be edited.' });
  }

  const { title, client_name, start_date, end_date, total_value, description } = req.body;
  db.prepare(`
    UPDATE contracts SET title=?, client_name=?, start_date=?, end_date=?, total_value=?, description=?,
      file_path = COALESCE(?, file_path), file_name = COALESCE(?, file_name), updated_at = datetime('now')
    WHERE id = ?
  `).run(title, client_name, start_date, end_date, total_value, description || null,
    req.file ? req.file.filename : null, req.file ? req.file.originalname : null, req.params.id);

  logAction({ user: req.user, action: 'UPDATE', entityType: 'contract', entityId: req.params.id, details: req.body });
  res.json({ message: 'Contract updated.' });
});

// Terminate contract (Admin only)
router.post('/:id/terminate', authorize('admin'), (req, res) => {
  db.prepare("UPDATE contracts SET status = 'Terminated', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  logAction({ user: req.user, action: 'TERMINATE', entityType: 'contract', entityId: req.params.id, details: req.body.reason });
  res.json({ message: 'Contract terminated.' });
});

// Delete contract (Admin only, Draft only)
router.delete('/:id', authorize('admin'), (req, res) => {
  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!contract) return res.status(404).json({ message: 'Contract not found.' });
  if (contract.status !== 'Draft') return res.status(400).json({ message: 'Only draft contracts can be deleted.' });

  db.prepare('DELETE FROM contracts WHERE id = ?').run(req.params.id);
  logAction({ user: req.user, action: 'DELETE', entityType: 'contract', entityId: req.params.id, details: { title: contract.title } });
  res.json({ message: 'Contract deleted.' });
});

// Download contract document
router.get('/:id/document', (req, res) => {
  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!contract || !contract.file_path) return res.status(404).json({ message: 'No document attached.' });
  res.download(path.join(uploadDir, contract.file_path), contract.file_name);
});

module.exports = router;
