// Uses Node's built-in `node:sqlite` module (stable in Node 22.5+, no native
// compilation / npm install required). This keeps the whole system runnable
// with zero external database server, while the schema below maps directly
// onto the PostgreSQL/MySQL schema.sql shipped alongside this project.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'cmpms.sqlite');
const nativeDb = new DatabaseSync(dbPath);

nativeDb.exec('PRAGMA journal_mode = WAL;');
nativeDb.exec('PRAGMA foreign_keys = ON;');

// Thin adapter so the rest of the codebase can keep using the familiar
// better-sqlite3-style `db.prepare(sql).run/get/all(...)` and `db.exec(sql)` API.
const stmtCache = new Map();
function getStmt(sql) {
  if (!stmtCache.has(sql)) stmtCache.set(sql, nativeDb.prepare(sql));
  return stmtCache.get(sql);
}

// node:sqlite requires named params to be prefixed (e.g. @foo) and passed as
// a single object; it does not accept a plain object the way better-sqlite3
// does for `?` placeholders mixed with named ones, so we normalize args.
function normalizeArgs(args) {
  if (args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    return [args[0]];
  }
  return args;
}

const db = {
  exec: (sql) => nativeDb.exec(sql),
  prepare: (sql) => {
    const stmt = getStmt(sql);
    return {
      run: (...args) => stmt.run(...normalizeArgs(args)),
      get: (...args) => stmt.get(...normalizeArgs(args)),
      all: (...args) => stmt.all(...normalizeArgs(args)),
    };
  },
};

// ---------------------------------------------------------------------------
// Schema. Designed to map 1:1 onto a PostgreSQL/MySQL schema (see schema.sql
// in the project root) — SQLite is used here purely so the whole system runs
// out-of-the-box with zero external database server to install.
// ---------------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','finance_officer','approver','encoder')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  total_value REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Active','Completed','Terminated')),
  description TEXT,
  file_path TEXT,
  file_name TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_name TEXT NOT NULL CHECK(step_name IN ('Department Head','Finance','Admin')),
  required_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected','Skipped')),
  acted_by INTEGER REFERENCES users(id),
  comment TEXT,
  acted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_code TEXT NOT NULL UNIQUE,
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  payment_type TEXT NOT NULL CHECK(payment_type IN ('Advance','Progress','Final')),
  due_date TEXT NOT NULL,
  paid_date TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Paid','Overdue')),
  notes TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_approvals_contract ON approvals(contract_id);
`);

module.exports = db;
