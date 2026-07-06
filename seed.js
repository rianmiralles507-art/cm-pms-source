require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/db');

console.log('Seeding CM-PMS database...');

// Wipe existing data (fresh seed)
db.exec(`
  DELETE FROM audit_logs;
  DELETE FROM payments;
  DELETE FROM approvals;
  DELETE FROM contracts;
  DELETE FROM users;
`);

const hash = (pw) => bcrypt.hashSync(pw, 10);

const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)');
const users = [
  ['Alex Santos', 'admin@cmpms.com', hash('Admin@123'), 'admin'],
  ['Maria Cruz', 'finance@cmpms.com', hash('Finance@123'), 'finance_officer'],
  ['James Reyes', 'approver@cmpms.com', hash('Approver@123'), 'approver'],
  ['Liza Torres', 'encoder@cmpms.com', hash('Encoder@123'), 'encoder'],
];
const userIds = {};
users.forEach(([name, email, hashPw, role]) => {
  const info = insertUser.run(name, email, hashPw, role);
  userIds[role] = info.lastInsertRowid;
});

const insertContract = db.prepare(`
  INSERT INTO contracts (contract_code, title, client_name, start_date, end_date, total_value, description, status, created_by)
  VALUES (?,?,?,?,?,?,?,?,?)
`);
const insertApproval = db.prepare(`
  INSERT INTO approvals (contract_id, step_order, step_name, required_role, status, acted_by, comment, acted_at)
  VALUES (?,?,?,?,?,?,?,?)
`);
const insertPayment = db.prepare(`
  INSERT INTO payments (payment_code, contract_id, amount, payment_type, due_date, paid_date, status, created_by)
  VALUES (?,?,?,?,?,?,?,?)
`);

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (base, days) => { const d = new Date(base); d.setDate(d.getDate() + days); return d; };

const sampleContracts = [
  {
    code: 'CTR-2026-0001', title: 'Office Supplies Annual Contract', client: 'Manila Supply Co.',
    start: addDays(today, -200), end: addDays(today, 165), value: 850000,
    desc: 'Annual supply of office consumables for HQ and branches.', status: 'Active',
    approvals: ['Approved', 'Approved', 'Approved'],
    payments: [
      { type: 'Advance', amount: 170000, due: addDays(today, -180), paid: addDays(today, -178), status: 'Paid' },
      { type: 'Progress', amount: 340000, due: addDays(today, -20), paid: addDays(today, -18), status: 'Paid' },
      { type: 'Final', amount: 340000, due: addDays(today, 60), paid: null, status: 'Pending' },
    ],
  },
  {
    code: 'CTR-2026-0002', title: 'IT Infrastructure Upgrade', client: 'TechBridge Solutions Inc.',
    start: addDays(today, -30), end: addDays(today, 335), value: 4200000,
    desc: 'Server, network, and endpoint upgrade project across all offices.', status: 'Draft',
    approvals: ['Approved', 'Pending', 'Pending'],
    payments: [
      { type: 'Advance', amount: 840000, due: addDays(today, 10), paid: null, status: 'Pending' },
    ],
  },
  {
    code: 'CTR-2026-0003', title: 'Building Maintenance Services', client: 'ProCare Facilities Mgmt.',
    start: addDays(today, -400), end: addDays(today, -20), value: 1200000,
    desc: 'Janitorial and maintenance services, 1-year term.', status: 'Completed',
    approvals: ['Approved', 'Approved', 'Approved'],
    payments: [
      { type: 'Advance', amount: 300000, due: addDays(today, -390), paid: addDays(today, -388), status: 'Paid' },
      { type: 'Progress', amount: 500000, due: addDays(today, -200), paid: addDays(today, -195), status: 'Paid' },
      { type: 'Final', amount: 400000, due: addDays(today, -15), paid: addDays(today, -10), status: 'Paid' },
    ],
  },
  {
    code: 'CTR-2026-0004', title: 'Marketing Campaign Agency Retainer', client: 'BrightWave Media',
    start: addDays(today, -60), end: addDays(today, 120), value: 2000000,
    desc: 'Retainer contract for digital marketing and brand campaigns.', status: 'Active',
    approvals: ['Approved', 'Approved', 'Approved'],
    payments: [
      { type: 'Advance', amount: 500000, due: addDays(today, -50), paid: addDays(today, -49), status: 'Paid' },
      { type: 'Progress', amount: 750000, due: addDays(today, -5), paid: null, status: 'Pending' }, // will become overdue
      { type: 'Final', amount: 750000, due: addDays(today, 90), paid: null, status: 'Pending' },
    ],
  },
  {
    code: 'CTR-2026-0005', title: 'Fleet Vehicle Leasing', client: 'RoadStar Leasing Corp.',
    start: addDays(today, -10), end: addDays(today, 355), value: 3100000,
    desc: 'Lease of 15 service vehicles for logistics team.', status: 'Draft',
    approvals: ['Pending', 'Pending', 'Pending'],
    payments: [],
  },
  {
    code: 'CTR-2026-0006', title: 'Legal Retainer Agreement', client: 'Del Rosario Law Offices',
    start: addDays(today, -500), end: addDays(today, -100), value: 600000,
    desc: 'External legal counsel retainer, terminated early due to scope change.', status: 'Terminated',
    approvals: ['Approved', 'Approved', 'Approved'],
    payments: [
      { type: 'Advance', amount: 300000, due: addDays(today, -480), paid: addDays(today, -475), status: 'Paid' },
    ],
  },
];

const steps = [
  { order: 1, name: 'Department Head', role: 'approver' },
  { order: 2, name: 'Finance', role: 'finance_officer' },
  { order: 3, name: 'Admin', role: 'admin' },
];

let paymentCounter = 1;
sampleContracts.forEach((c) => {
  const info = insertContract.run(c.code, c.title, c.client, iso(c.start), iso(c.end), c.value, c.desc, c.status, userIds.encoder);
  const contractId = info.lastInsertRowid;

  steps.forEach((s, idx) => {
    const st = c.approvals[idx];
    insertApproval.run(
      contractId, s.order, s.name, s.role, st,
      st === 'Approved' ? userIds[s.role] : null,
      st === 'Approved' ? 'Looks good, approved.' : null,
      st === 'Approved' ? iso(addDays(c.start, idx)) : null,
    );
  });

  c.payments.forEach((p) => {
    const code = `PAY-2026-${String(paymentCounter++).padStart(4, '0')}`;
    insertPayment.run(code, contractId, p.amount, p.type, iso(p.due), p.paid ? iso(p.paid) : null, p.status, userIds.finance_officer);
  });
});

// A few audit log entries for the activity feed
const logStmt = db.prepare(`INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)`);
logStmt.run(userIds.encoder, 'Liza Torres', 'CREATE', 'contract', 1, 'Created contract CTR-2026-0001');
logStmt.run(userIds.approver, 'James Reyes', 'APPROVE', 'approval', 1, 'Approved Department Head step');
logStmt.run(userIds.finance_officer, 'Maria Cruz', 'MARK_PAID', 'payment', 1, 'Marked PAY-2026-0001 as paid');
logStmt.run(userIds.admin, 'Alex Santos', 'LOGIN', 'user', userIds.admin, null);

console.log('Seed complete. Demo accounts:');
console.log('  Admin           admin@cmpms.com     / Admin@123');
console.log('  Finance Officer finance@cmpms.com   / Finance@123');
console.log('  Approver        approver@cmpms.com  / Approver@123');
console.log('  Encoder         encoder@cmpms.com   / Encoder@123');
