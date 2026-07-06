const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { runSmartChecks } = require('../utils/statusUpdater');

const router = express.Router();
router.use(authenticate);

router.get('/summary', (req, res) => {
  runSmartChecks();

  const totalContracts = db.prepare('SELECT COUNT(*) as c FROM contracts').get().c;
  const activeContracts = db.prepare("SELECT COUNT(*) as c FROM contracts WHERE status='Active'").get().c;
  const pendingApprovals = db.prepare("SELECT COUNT(*) as c FROM approvals WHERE status='Pending'").get().c;
  const totalPaymentsReleased = db.prepare("SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE status='Paid'").get().s;

  const statusDistribution = db.prepare(`
    SELECT status, COUNT(*) as count FROM contracts GROUP BY status
  `).all();

  const monthlyTrends = db.prepare(`
    SELECT strftime('%Y-%m', paid_date) as month, SUM(amount) as total
    FROM payments WHERE status='Paid' AND paid_date IS NOT NULL
    GROUP BY month ORDER BY month DESC LIMIT 6
  `).all().reverse();

  const recentActivity = db.prepare(`
    SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 12
  `).all();

  const overduePayments = db.prepare("SELECT COUNT(*) as c FROM payments WHERE status='Overdue'").get().c;

  res.json({
    totalContracts,
    activeContracts,
    pendingApprovals,
    totalPaymentsReleased,
    overduePayments,
    statusDistribution,
    monthlyTrends,
    recentActivity,
  });
});

module.exports = router;
