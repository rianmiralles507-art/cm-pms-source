# CM-PMS — Contract Management and Payment Monitoring System

A full-stack web app for managing contracts, multi-step approvals, and payment
monitoring in one dashboard.

- **Frontend:** React 19 + Vite + Tailwind CSS v4 + Recharts + Lucide icons
- **Backend:** Node.js + Express, REST API, JWT authentication
- **Database:** SQLite via Node's built-in `node:sqlite` module (zero install —
  see [Using PostgreSQL/MySQL instead](#using-postgresqlmysql-instead) to swap
  in a production database using the included `schema.sql`)
- **File storage:** Local disk (`backend/uploads`) — swap for AWS S3 later if needed

---

## 1. Folder structure

```
cm-pms/
├── backend/
│   ├── config/db.js          # Database connection + schema bootstrap
│   ├── middleware/auth.js    # JWT auth + role-based access control
│   ├── routes/                # auth, users, contracts, approvals, payments, dashboard, reports
│   ├── utils/audit.js        # Audit trail logger
│   ├── utils/statusUpdater.js# Smart auto-status / overdue detection
│   ├── uploads/               # Uploaded contract documents (created at runtime)
│   ├── data/                  # cmpms.sqlite (created at runtime)
│   ├── seed.js                 # Sample data loader
│   └── server.js
├── frontend/
│   └── src/
│       ├── api/axios.js        # API client (attaches JWT automatically)
│       ├── context/AuthContext.jsx
│       ├── components/         # Sidebar, Topbar, Layout, Modal, ConfirmDialog, StatCard, StatusBadge
│       └── pages/               # Login, Dashboard, Contracts, ContractDetail, Approvals, Payments, Reports, Users
└── schema.sql                  # PostgreSQL (+ MySQL notes) schema for production use
```

## 2. Requirements

- **Node.js v22.5 or later** (the backend uses the built-in `node:sqlite`
  module, which needs no compiler / native build tools — handy in locked-down
  environments). Check with `node -v`.

## 3. Setup

### Backend

```bash
cd backend
cp .env.example .env       # adjust JWT_SECRET etc. if you like
npm install
npm run seed                # creates the SQLite DB and loads demo data
npm run dev                  # starts the API on http://localhost:5000
```

### Frontend (in a second terminal)

```bash
cd frontend
npm install
npm run dev                  # starts the app on http://localhost:5173
```

The frontend dev server proxies `/api/*` to `http://localhost:5000`, so just
open **http://localhost:5173**.

### Demo accounts (created by `npm run seed`)

| Role             | Email                  | Password       |
|------------------|-------------------------|----------------|
| Admin            | admin@cmpms.com        | Admin@123      |
| Finance Officer  | finance@cmpms.com      | Finance@123    |
| Approver         | approver@cmpms.com     | Approver@123   |
| Encoder          | encoder@cmpms.com      | Encoder@123    |

The seed data includes 6 contracts in different states (Draft, Active,
Completed, Terminated), 11 payments (including one auto-flagged Overdue), and
a short activity trail — enough to see every screen populated on first login.

## 4. Roles & permissions

| Action                              | Admin | Finance Officer | Approver | Encoder |
|--------------------------------------|:-----:|:----------------:|:--------:|:-------:|
| Create / edit contracts              |  ✅   |                  |          |   ✅    |
| Delete contracts (Draft only)        |  ✅   |                  |          |         |
| Terminate contracts                  |  ✅   |                  |          |         |
| Act on "Department Head" approval    |       |                  |    ✅    |         |
| Act on "Finance" approval            |       |        ✅        |          |         |
| Act on "Admin" approval              |  ✅   |                  |          |         |
| Record / edit payments               |  ✅   |        ✅        |          |         |
| Mark payments paid                   |  ✅   |        ✅        |          |         |
| Manage users                         |  ✅   |                  |          |         |
| View dashboard, reports              |  ✅   |        ✅        |    ✅    |   ✅    |

Every contract goes through the same 3-step workflow: **Department Head →
Finance → Admin**. A contract only becomes **Active** once all three steps are
approved; any rejection stops the workflow until the contract is resubmitted.

## 5. Smart features implemented

- **Auto-calculated balances** — every contract shows `total_value - sum(paid payments)`.
- **Overdue detection** — a background check (on every payment list request,
  every dashboard load, and hourly via `node-cron`) flips any `Pending`
  payment past its due date to `Overdue`.
- **Auto contract status** — an `Active` contract whose end date has passed is
  automatically marked `Completed`.
- **Audit trail** — every create/update/delete/approve/reject/login/export is
  written to `audit_logs` and shown on the Dashboard's Recent Activity feed.
- **Search & filter** — contracts and payments both support text search and
  status filters from the API (`?search=`, `?status=`).

## 6. REST API reference

All endpoints are prefixed with `/api` and (except `/auth/login` and
`/health`) require `Authorization: Bearer <token>`.

```
POST   /auth/login                          Log in, returns { token, user }
GET    /auth/me                             Current user info

GET    /users                               List users (admin)
POST   /users                               Create user (admin)
PUT    /users/:id                           Update user (admin)
DELETE /users/:id                           Deactivate user (admin)
GET    /users/approvers/list                Users eligible to approve

GET    /contracts?search=&status=           List / search / filter contracts
GET    /contracts/:id                       Contract + approvals + payments
POST   /contracts                           Create (multipart: document upload)
PUT    /contracts/:id                       Update (Draft only, unless admin)
POST   /contracts/:id/terminate             Terminate (admin)
DELETE /contracts/:id                       Delete (admin, Draft only)
GET    /contracts/:id/document               Download attached file

GET    /approvals/pending                   My pending approval queue
GET    /approvals/contract/:contractId       Full timeline for a contract
POST   /approvals/:id/approve               { comment }
POST   /approvals/:id/reject                { comment }
POST   /approvals/contract/:id/resubmit      Reset steps to Pending

GET    /payments?status=&contract_id=&payment_type=
POST   /payments                             Create payment
PUT    /payments/:id                        Update payment
POST   /payments/:id/mark-paid               { paid_date? }
DELETE /payments/:id                        Delete (admin)

GET    /dashboard/summary                   Cards, charts, activity feed

GET    /reports/:type                        JSON preview (contract-summary | payment-status | overdue-payments)
GET    /reports/:type/excel                  Download .xlsx
GET    /reports/:type/pdf                    Download .pdf
```

## 7. Using PostgreSQL/MySQL instead

The bundled SQLite setup is meant to get you running in minutes with zero
external services. To move to PostgreSQL or MySQL for production:

1. Run `schema.sql` against your Postgres/MySQL instance (MySQL syntax notes
   are included as comments at the bottom of the file).
2. Swap `backend/config/db.js` for a driver-based client (e.g. `pg` or
   `mysql2`) and update the `prepare().run/get/all()` calls in `routes/*.js`
   to your driver's query style — the SQL statements themselves are already
   ANSI-standard and need no rewriting.
3. Point `DATABASE_URL` (add this to `.env`) at your instance and update
   `config/db.js` to connect using it.

## 8. Security notes

- Passwords are hashed with bcrypt.
- Sessions are stateless JWTs (default expiry 8h, configurable via `.env`).
- Role-based access control is enforced on the server for every write
  operation — the UI simply hides actions a role can't perform.
- Uploaded files are restricted to `.pdf` / `.doc` / `.docx`, capped at 10MB.

## 9. Next steps you may want

- Wire up real email/SMS notifications for pending approvals and due payments.
- Add refresh tokens / session revocation if you need shorter-lived access tokens.
- Move file storage to AWS S3 for multi-server deployments.
