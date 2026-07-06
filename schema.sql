-- =============================================================================
-- CM-PMS — PostgreSQL schema (production-grade alternative to the bundled
-- SQLite database used for local/demo runs). MySQL notes are inlined as
-- comments where syntax differs.
-- =============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'finance_officer', 'approver', 'encoder');
CREATE TYPE contract_status AS ENUM ('Draft', 'Active', 'Completed', 'Terminated');
CREATE TYPE approval_step_name AS ENUM ('Department Head', 'Finance', 'Admin');
CREATE TYPE approval_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Skipped');
CREATE TYPE payment_type AS ENUM ('Advance', 'Progress', 'Final');
CREATE TYPE payment_status AS ENUM ('Pending', 'Paid', 'Overdue');

CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  email           VARCHAR(190) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            user_role NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contracts (
  id              SERIAL PRIMARY KEY,
  contract_code   VARCHAR(30) NOT NULL UNIQUE,
  title           VARCHAR(200) NOT NULL,
  client_name     VARCHAR(200) NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  total_value     NUMERIC(14,2) NOT NULL,
  status          contract_status NOT NULL DEFAULT 'Draft',
  description     TEXT,
  file_path       VARCHAR(255),
  file_name       VARCHAR(255),
  created_by      INTEGER NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE approvals (
  id              SERIAL PRIMARY KEY,
  contract_id     INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  step_order      SMALLINT NOT NULL,
  step_name       approval_step_name NOT NULL,
  required_role   user_role NOT NULL,
  status          approval_status NOT NULL DEFAULT 'Pending',
  acted_by        INTEGER REFERENCES users(id),
  comment         TEXT,
  acted_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id              SERIAL PRIMARY KEY,
  payment_code    VARCHAR(30) NOT NULL UNIQUE,
  contract_id     INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  amount          NUMERIC(14,2) NOT NULL,
  payment_type    payment_type NOT NULL,
  due_date        DATE NOT NULL,
  paid_date       DATE,
  status          payment_status NOT NULL DEFAULT 'Pending',
  notes           TEXT,
  created_by      INTEGER NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id),
  user_name       VARCHAR(150),
  action          VARCHAR(50) NOT NULL,
  entity_type     VARCHAR(50) NOT NULL,
  entity_id       INTEGER,
  details         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_payments_contract ON payments(contract_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_approvals_contract ON approvals(contract_id);

-- -----------------------------------------------------------------------------
-- MySQL notes:
--   * Replace CREATE TYPE ... with VARCHAR + CHECK constraints, or plain ENUM(...)
--     column definitions inline (e.g. role ENUM('admin','finance_officer',...)).
--   * SERIAL -> INT AUTO_INCREMENT PRIMARY KEY
--   * TIMESTAMPTZ -> DATETIME, now() -> CURRENT_TIMESTAMP
--   * NUMERIC(14,2) is supported as-is in MySQL.
-- -----------------------------------------------------------------------------
