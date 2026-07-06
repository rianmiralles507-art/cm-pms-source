const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

// Pending approvals assigned to the logged-in user's role (their action queue)
router.get('/pending', (req, res) => {
  const rows = db.prepare(`
    SELECT ap.*, c.title, c.contract_code, c.client_name, c.total_value
    FROM approvals ap
    JOIN contracts c ON c.id = ap.contract_id
    WHERE ap.required_role = ? AND ap.status = 'Pending'
      AND ap.step_order = (
        SELECT MIN(step_order) FROM approvals WHERE contract_id = ap.contract_id AND status = 'Pending'
      )
    ORDER BY ap.created_at ASC
  `).all(req.user.role);
  res.json(rows);
});

// Full approval timeline for a contract
router.get('/contract/:contractId', (req, res) => {
  const rows = db.prepare(`
    SELECT ap.*, u.name as acted_by_name FROM approvals ap
    LEFT JOIN users u ON u.id = ap.acted_by
    WHERE contract_id = ? ORDER BY step_order
  `).all(req.params.contractId);
  res.json(rows);
});

// Approve a step
router.post('/:id/approve', (req, res) => {
  const step = db.prepare('SELECT * FROM approvals WHERE id = ?').get(req.params.id);
  if (!step) return res.status(404).json({ message: 'Approval step not found.' });
  if (step.status !== 'Pending') return res.status(400).json({ message: 'This step has already been actioned.' });
  if (step.required_role !== req.user.role) return res.status(403).json({ message: 'This step is not assigned to your role.' });

  // must be the current active step (previous steps approved)
  const priorPending = db.prepare(`SELECT COUNT(*) as cnt FROM approvals WHERE contract_id = ? AND step_order < ? AND status != 'Approved'`).get(step.contract_id, step.step_order);
  if (priorPending.cnt > 0) return res.status(400).json({ message: 'Previous approval steps must be completed first.' });

  db.prepare(`UPDATE approvals SET status='Approved', acted_by=?, comment=?, acted_at=datetime('now') WHERE id=?`)
    .run(req.user.id, req.body.comment || null, req.params.id);

  logAction({ user: req.user, action: 'APPROVE', entityType: 'approval', entityId: req.params.id, details: { contract_id: step.contract_id, step: step.step_name, comment: req.body.comment } });

  // If this was the last step, activate the contract
  const remaining = db.prepare(`SELECT COUNT(*) as cnt FROM approvals WHERE contract_id = ? AND status != 'Approved'`).get(step.contract_id);
  if (remaining.cnt === 0) {
    db.prepare(`UPDATE contracts SET status='Active', updated_at=datetime('now') WHERE id=?`).run(step.contract_id);
    logAction({ user: req.user, action: 'AUTO_ACTIVATE', entityType: 'contract', entityId: step.contract_id, details: 'All approval steps completed.' });
  }

  res.json({ message: 'Step approved.' });
});

// Reject a step
router.post('/:id/reject', (req, res) => {
  const step = db.prepare('SELECT * FROM approvals WHERE id = ?').get(req.params.id);
  if (!step) return res.status(404).json({ message: 'Approval step not found.' });
  if (step.status !== 'Pending') return res.status(400).json({ message: 'This step has already been actioned.' });
  if (step.required_role !== req.user.role) return res.status(403).json({ message: 'This step is not assigned to your role.' });

  db.prepare(`UPDATE approvals SET status='Rejected', acted_by=?, comment=?, acted_at=datetime('now') WHERE id=?`)
    .run(req.user.id, req.body.comment || null, req.params.id);

  logAction({ user: req.user, action: 'REJECT', entityType: 'approval', entityId: req.params.id, details: { contract_id: step.contract_id, step: step.step_name, comment: req.body.comment } });
  res.json({ message: 'Step rejected.' });
});

// Resubmit a contract for approval after rejection (resets all steps to Pending)
router.post('/contract/:contractId/resubmit', (req, res) => {
  db.prepare(`UPDATE approvals SET status='Pending', acted_by=NULL, comment=NULL, acted_at=NULL WHERE contract_id = ?`).run(req.params.contractId);
  logAction({ user: req.user, action: 'RESUBMIT', entityType: 'contract', entityId: req.params.contractId });
  res.json({ message: 'Contract resubmitted for approval.' });
});

module.exports = router;
