const db = require('../config/db');
const { logAction } = require('./audit');

/**
 * Smart feature: auto-detect overdue payments.
 * Any payment still "Pending" whose due_date has passed becomes "Overdue".
 */
function updateOverduePayments() {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = db.prepare(`
    SELECT id, contract_id FROM payments WHERE status = 'Pending' AND due_date < ?
  `).all(today);

  const update = db.prepare(`UPDATE payments SET status = 'Overdue', updated_at = datetime('now') WHERE id = ?`);
  overdue.forEach((p) => {
    update.run(p.id);
    logAction({ user: null, action: 'AUTO_OVERDUE', entityType: 'payment', entityId: p.id, details: 'Payment automatically marked overdue (due date passed).' });
  });
  return overdue.length;
}

/**
 * Smart feature: auto-update contract status based on dates.
 * - Active contracts whose end_date has passed become "Completed".
 * - Draft/Terminated contracts are left untouched (manual/approval controlled).
 */
function updateContractStatuses() {
  const today = new Date().toISOString().slice(0, 10);
  const toComplete = db.prepare(`
    SELECT id FROM contracts WHERE status = 'Active' AND end_date < ?
  `).all(today);

  const update = db.prepare(`UPDATE contracts SET status = 'Completed', updated_at = datetime('now') WHERE id = ?`);
  toComplete.forEach((c) => {
    update.run(c.id);
    logAction({ user: null, action: 'AUTO_COMPLETE', entityType: 'contract', entityId: c.id, details: 'Contract automatically marked completed (end date passed).' });
  });
  return toComplete.length;
}

function runSmartChecks() {
  const overdueCount = updateOverduePayments();
  const completedCount = updateContractStatuses();
  return { overdueCount, completedCount };
}

module.exports = { runSmartChecks, updateOverduePayments, updateContractStatuses };
