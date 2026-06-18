# ManageRentals — System Documentation
## Infrastructure, Connections, and Implementation Reference

**Version:** 1.0  
**Date:** June 2026  
**Application URL:** https://rentals.manoim.com

---

## Table of Contents

1. [Infrastructure Overview](#1-infrastructure-overview)
2. [Services & Connections](#2-services--connections)
3. [Environment Variables](#3-environment-variables)
4. [Authentication](#4-authentication)
5. [Database — Full Schema](#5-database--full-schema)
6. [Application Structure](#6-application-structure)
7. [Route Map](#7-route-map)
8. [Server Actions](#8-server-actions)
9. [Components](#9-components)
10. [Data Flow](#10-data-flow)
11. [Local Development](#11-local-development)

---

## 1. Infrastructure Overview

```
Developer Machine (macOS)
        │
        │  git push → main
        ▼
  GitHub Repository
  mmanoim/managerentals
        │
        │  Vercel webhook triggers on every push to main
        ▼
  Vercel (Build + Hosting)
  ├── Framework: Next.js 16.2.9
  ├── Build: next build (TypeScript, Tailwind CSS)
  ├── Runtime: Edge/Node.js serverless functions
  └── Custom domain: rentals.manoim.com
        │
        │  All database reads/writes over HTTPS REST (PostgREST)
        │  All auth token exchanges over HTTPS
        ▼
  Supabase (Backend)
  ├── Project: managerentals
  ├── Project ref: naugzylusfeeizdjgrfb
  ├── Region: (default US East)
  ├── Database: PostgreSQL 15
  ├── Auth: Supabase Auth (email + password)
  ├── API: PostgREST (auto-generated REST from schema)
  └── URL: https://naugzylusfeeizdjgrfb.supabase.co
```

**Deployment model:** Push to GitHub `main` → Vercel auto-builds → live within ~60 seconds. No manual deploy step ever required.

---

## 2. Services & Connections

### 2.1 Vercel

| Item | Value |
|------|-------|
| Project name | managerentals |
| Production URL | https://rentals.manoim.com |
| Build command | `next build` |
| Output directory | `.next` |
| Framework preset | Next.js |
| Triggers | Any push to `main` branch of `mmanoim/managerentals` |
| Environment variables | Set in Vercel dashboard (mirrors `.env.local`) |

### 2.2 GitHub

| Item | Value |
|------|-------|
| Repository | mmanoim/managerentals |
| Default branch | `main` |
| Visibility | Private |
| Vercel integration | Connected; auto-deploy on push |

### 2.3 Supabase

| Item | Value |
|------|-------|
| Organization | manoim |
| Project name | managerentals |
| Project ref | `naugzylusfeeizdjgrfb` |
| Database | PostgreSQL 15 |
| REST API URL | `https://naugzylusfeeizdjgrfb.supabase.co/rest/v1/` |
| Auth URL | `https://naugzylusfeeizdjgrfb.supabase.co/auth/v1/` |
| Dashboard | https://supabase.com/dashboard/project/naugzylusfeeizdjgrfb |

### 2.4 Supabase CLI

| Item | Value |
|------|-------|
| CLI version | 2.106.0 |
| Binary location | `/opt/homebrew/bin/supabase` |
| Config file | `supabase/config.toml` |
| Project ID in config | `managerentals` |
| Migrations directory | `supabase/migrations/` |
| Link command | `supabase link --project-ref naugzylusfeeizdjgrfb` |
| Push command | `supabase db push` |

Migrations are SQL files committed to git and applied to the live Supabase database via `supabase db push`. This gives a traceable, version-controlled schema history.

---

## 3. Environment Variables

Stored in `.env.local` locally. Must also be set in the Vercel project dashboard under Settings → Environment Variables.

| Variable | Scope | Value/Description |
|----------|-------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | `https://naugzylusfeeizdjgrfb.supabase.co` — Supabase project URL. `NEXT_PUBLIC_` prefix exposes it to the browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | JWT with role `anon`. Used for all client-side queries and server-side queries made on behalf of logged-in users. Honors Row Level Security. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | JWT with role `service_role`. Bypasses RLS. Only used for admin operations (data migrations, seeding). Never exposed to the browser. |

**Key distinction:**  
- `ANON_KEY` → respects RLS → what all normal app queries use  
- `SERVICE_ROLE_KEY` → bypasses RLS → only for one-off admin scripts

---

## 4. Authentication

### Flow

```
User enters email + password at /login
        │
        ▼
Server action: login() in app/actions/auth.ts
        │
        ▼
supabase.auth.signInWithPassword({ email, password })
        │
        ▼
Supabase returns session (JWT access token + refresh token)
        │
        ▼
@supabase/ssr writes tokens to HTTP-only cookies
(handled automatically by createServerClient cookie callbacks)
        │
        ▼
middleware.ts validates session on every request
├── No valid session + not /login → redirect to /login
└── Valid session + /login → redirect to /properties
```

### Implementation

**`middleware.ts`** — runs on every request (all routes except static assets):
- Creates a Supabase server client using cookies from the incoming request
- Calls `supabase.auth.getUser()` (verifies JWT with Supabase)
- Redirects unauthenticated users to `/login`
- Redirects authenticated users away from `/login` to `/properties`
- Passes cookies through to the response so session stays refreshed

**`lib/supabase/server.ts`** — server-side Supabase client:
- Used in Server Components and Server Actions
- Reads/writes auth cookies via Next.js `cookies()` API
- Uses `ANON_KEY` (not service role)

**`lib/supabase/client.ts`** — browser-side Supabase client:
- Used in Client Components (`'use client'`)
- Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Session is maintained automatically via `@supabase/ssr`

### Credentials

| Item | Value |
|------|-------|
| Auth provider | Email + password |
| Admin user | marina@manoim.com |
| Password reset | Manual via Supabase dashboard (no self-serve reset in app) |
| Session duration | Supabase default (1 hour access token, auto-refreshed) |
| Session storage | HTTP-only cookies (secure, not accessible to JavaScript) |

---

## 5. Database — Full Schema

All tables are in the `public` schema. Row Level Security (RLS) is enabled on every table with a policy that grants full access to authenticated users.

### Enums

```sql
lease_status:   'active' | 'expired' | 'terminated'
payment_method: 'check' | 'cash' | 'cashapp' | 'zelle' | 'venmo' | 'td_business'
```

---

### Table: `properties`

Core entity. One row per physical address.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen | |
| address | text | NOT NULL | Full street address |
| city | text | nullable | |
| state | text | nullable | |
| zip | text | nullable | |
| purchase_date | date | nullable | |
| purchase_price | numeric | nullable | |
| notes | text | nullable | |
| archived | boolean | NOT NULL, default false | Soft delete |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

---

### Table: `units`

Each property has one or more units.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen | |
| property_id | uuid | NOT NULL, FK → properties.id | |
| unit_label | text | NOT NULL | e.g. "Unit 1", "Apt 2A" |
| monthly_rent | numeric | nullable | Asking rent (informational) |
| archived | boolean | NOT NULL, default false | |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

---

### Table: `tenants`

Individual people. A tenant can appear on multiple leases (across time or across units).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen | |
| first_name | text | NOT NULL | |
| last_name | text | NOT NULL | |
| email | text | nullable | |
| phone | text | nullable | |
| notes | text | nullable | |
| archived | boolean | NOT NULL, default false | |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

---

### Table: `leases`

A lease is the agreement between owner and tenants for a specific unit. Multiple leases per unit represent the history of rent changes and tenants over time.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen | |
| unit_id | uuid | NOT NULL, FK → units.id | |
| rent_amount | numeric | NOT NULL | Monthly rent for this lease period |
| late_fee_amount | numeric | nullable | Default late fee for this lease |
| lease_start | date | NOT NULL | |
| lease_end | date | nullable | Null = ongoing |
| renewal_date | date | nullable | |
| status | lease_status enum | NOT NULL, default 'active' | active / expired / terminated |
| security_deposit | numeric | nullable | |
| security_deposit_returned | numeric | nullable | Amount returned |
| security_deposit_return_date | date | nullable | |
| notes | text | nullable | |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

---

### Table: `lease_tenants`

Many-to-many join between leases and tenants. Supports multiple tenants per lease (primary + co-signer).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| lease_id | uuid | NOT NULL, FK → leases.id | Composite PK |
| tenant_id | uuid | NOT NULL, FK → tenants.id | Composite PK |
| is_primary | boolean | NOT NULL, default true | |

---

### Table: `lease_ledger_entries`

Every financial event on a lease — both charges (rent due, late fee, adjustment) and payments received.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen | |
| lease_id | uuid | NOT NULL, FK → leases.id | |
| type | text | NOT NULL | `'charge'` or `'payment'` |
| subtype | text | nullable | For charges: `'rent'`, `'late_fee'`, `'adjustment'` |
| description | text | nullable | e.g. "Rent — June 2026" |
| amount | numeric | NOT NULL | Always positive |
| entry_date | date | NOT NULL, default today | |
| created_at | timestamptz | nullable | |

**Balance rule:** `balance = SUM(charges) - SUM(payments)`. Positive = tenant owes money. Negative = tenant has a credit.

---

### Table: `ledger_payment_parts`

Splits a payment entry into multiple methods (e.g., $400 Zelle + $350 Cash App = $750 payment).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen | |
| ledger_entry_id | uuid | NOT NULL, FK → lease_ledger_entries.id | |
| method | payment_method enum | NOT NULL | check / cash / cashapp / zelle / venmo / td_business |
| amount | numeric | NOT NULL | |
| reference | text | nullable | Check number, Zelle confirmation, etc. |
| created_at | timestamptz | nullable | |

---

### Table: `chart_of_accounts`

Configurable income/expense/transfer categories. Seeded with standard categories on first deploy.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen | |
| code | text | NOT NULL, UNIQUE | e.g. `'4010'`, `'5030'` |
| name | text | NOT NULL | e.g. `'Rental Income — 14 Cottage Unit 1'` |
| type | text | NOT NULL, CHECK | `'income'` / `'expense'` / `'transfer'` / `'equity'` |
| parent_id | uuid | nullable, FK → chart_of_accounts.id | For sub-accounts |
| archived | boolean | NOT NULL, default false | |
| created_at | timestamptz | NOT NULL | |

**Seeded accounts — Income (4000s):**

| Code | Name |
|------|------|
| 4010 | Rental Income — 14 Cottage Unit 1 (incl. Housing Authority payments) |
| 4020 | Rental Income — 14 Cottage Unit 2 |
| 4030 | Rental Income — 14 Cottage Unit 3 |
| 4040 | Rental Income — 19 Walters |
| 4050 | Rental Income — 48 Briarwood |
| 4060 | Rental Income — 9 Bray |
| 4070 | Rental Income — [next property] |
| 4100 | Late Fees |
| 4200 | Security Deposit Forfeited |

> Account 4300 does not exist. Housing Authority payments flow into 4010–4070 alongside regular tenant rent.

**Seeded accounts — Expense (5000s):**

| Code | Name |
|------|------|
| 5010 | Repairs & Maintenance |
| 5020 | Landscaping |
| 5030 | Utilities |
| 5040 | Insurance |
| 5050 | Property Management Fees |
| 5060 | Legal & Professional |
| 5070 | Advertising |
| 5080 | Office & Admin |
| 5090 | Travel |
| 5100 | Mortgage Interest |
| 5110 | Property Taxes |
| 5120 | Depreciation |
| 5130 | HOA Fees |
| 5140 | Cleaning |
| 5150 | Capital Improvements |

**Seeded accounts — Transfer (6000s):**

| Code | Name |
|------|------|
| 6010 | Transfer — Cash App to Joint |
| 6020 | Transfer — Venmo to Joint |
| 6030 | Transfer — Personal to Joint |
| 6040 | Transfer — Joint to Personal |

---

### Table: `accounts`

Real-world financial accounts (bank accounts, payment apps, cash). Seeded with all known accounts on first deploy.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen | |
| name | text | NOT NULL | Human-readable name |
| type | text | NOT NULL, CHECK | `'bank'` / `'payapp'` / `'cash'` / `'credit'` |
| institution | text | nullable | e.g. `'TD Bank'`, `'Cash App'` |
| last_four | text | nullable | Last 4 digits of account number |
| owner | text | NOT NULL, default 'joint', CHECK | `'joint'` / `'marina'` / `'jacob'` |
| payment_method | text | nullable | Links to ledger payment_method enum (e.g. `'cashapp'`) |
| opening_balance | numeric(12,2) | NOT NULL, default 0 | Balance at the start of tracking |
| is_active | boolean | NOT NULL, default true | |
| created_at | timestamptz | NOT NULL | |

**Seeded accounts:**

| Name | Type | Institution | Owner |
|------|------|-------------|-------|
| TD Bank Joint Checking | bank | TD Bank | joint |
| Marina — Personal Checking | bank | — | marina |
| Jacob — Personal Checking | bank | — | jacob |
| Cash App — Marina | payapp | Cash App | marina |
| Cash App — Jacob | payapp | Cash App | jacob |
| Venmo — Marina | payapp | Venmo | marina |
| Zelle | payapp | Zelle | joint |
| Cash on Hand | cash | — | joint |

---

### Table: `account_transactions`

Individual transactions in a real financial account — bank deposits, expenses, transfers. Can be entered manually or imported from CSV.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen | |
| account_id | uuid | NOT NULL, FK → accounts.id | Which account this belongs to |
| date | date | NOT NULL | Transaction date |
| description | text | NOT NULL | Bank description or user-entered memo |
| payee | text | nullable | Payee name (from CSV import) |
| amount | numeric(12,2) | NOT NULL | Positive = money in, negative = money out |
| category_id | uuid | nullable, FK → chart_of_accounts.id | Income/expense category |
| property_id | uuid | nullable, FK → properties.id | For expense allocation |
| check_number | text | nullable | For check payments |
| notes | text | nullable | User notes |
| source | text | NOT NULL, default 'manual', CHECK | `'manual'` / `'csv'` / `'pdf'` |
| import_batch_id | text | nullable | UUID grouping all rows from one CSV upload |
| source_payment_part_id | uuid | nullable, FK → ledger_payment_parts.id | Auto-created from tenant ledger |
| transfer_pair_id | uuid | nullable | Links the two sides of an inter-account transfer |
| reconciled | boolean | NOT NULL, default false | True when matched to a tenant payment |
| created_at | timestamptz | NOT NULL | |

**Indexes:**
- `account_transactions_account_id_idx` on `account_id`
- `account_transactions_date_idx` on `date`
- `account_transactions_reconciled_idx` on `reconciled` WHERE `reconciled = false` (partial index for fast unreconciled queries)
- `account_transactions_import_batch_idx` on `import_batch_id` WHERE `import_batch_id IS NOT NULL`

---

### Table: `reconciliations`

Links a tenant ledger payment entry to an account transaction. This is the bridge between Layer 1 (tenant ledger) and Layer 2 (bank accounts).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen | |
| lease_ledger_entry_id | uuid | nullable, FK → lease_ledger_entries.id | The tenant payment record |
| account_transaction_id | uuid | nullable, FK → account_transactions.id | The bank/account transaction |
| status | text | NOT NULL, default 'matched', CHECK | `'matched'` / `'partial'` / `'exception'` |
| notes | text | nullable | Explanation for partial or exception status |
| created_at | timestamptz | NOT NULL | |

**Indexes:**
- `reconciliations_ledger_entry_idx` on `lease_ledger_entry_id`
- `reconciliations_account_tx_idx` on `account_transaction_id`

**Status meanings:**
- `matched` — amounts agree; tenant payment confirmed in bank
- `partial` — the bank shows a different amount; needs review
- `exception` — something is wrong; flagged for manual attention

---

### Table: `distributions`

Partner cash distributions (money taken out of the business by Marina or Jacob).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen | |
| partner | text | NOT NULL | `'marina'` or `'jacob'` |
| date | date | NOT NULL | |
| amount | numeric | NOT NULL | |
| source | text | nullable | Which account it came from |
| destination | text | nullable | Where it went |
| notes | text | nullable | |
| created_at | timestamptz | NOT NULL | |

---

### Entity Relationship Summary

```
properties
    └── units (many per property)
            └── leases (many per unit, one per rate period)
                    ├── lease_tenants (many-to-many with tenants)
                    └── lease_ledger_entries (charges + payments)
                                └── ledger_payment_parts (split payment methods)
                                            │
                                            │ ← reconciliation bridge
                                            ▼
accounts ──────────────── account_transactions ──── reconciliations
chart_of_accounts ─────────────────────────────────────────────────►

tenants ← lease_tenants → leases
distributions (standalone)
```

---

## 6. Application Structure

```
managerentals/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx              Login page
│   ├── (dashboard)/
│   │   ├── layout.tsx                  Nav bar + main wrapper (all dashboard pages)
│   │   ├── properties/                 Property CRUD
│   │   ├── tenants/                    Tenant CRUD + balance view
│   │   ├── leases/                     Lease CRUD + ledger + charge/payment entry
│   │   ├── payments/                   Global payment list
│   │   ├── accounts/                   Account list, register, transactions
│   │   ├── categories/                 Chart of accounts management
│   │   ├── reconciliation/             Reconciliation UI
│   │   ├── distributions/              Partner distributions
│   │   └── reports/                    Financial reports
│   ├── actions/                        Server actions (all data mutations)
│   ├── globals.css                     Global Tailwind CSS entry point
│   ├── layout.tsx                      Root HTML shell
│   └── page.tsx                        Root redirect (/ → /properties)
├── components/                         Reusable UI components
├── lib/
│   └── supabase/
│       ├── server.ts                   Server-side Supabase client
│       ├── client.ts                   Browser-side Supabase client
│       └── types.ts                    Auto-generated TypeScript types from Supabase schema
├── middleware.ts                       Auth guard — runs on every request
├── supabase/
│   ├── config.toml                     Supabase CLI config
│   └── migrations/                     SQL migration files (applied via `supabase db push`)
│       └── 20260613000000_accounting_schema.sql
├── docs/                               Project documentation
│   ├── PRD.md                          Product requirements
│   ├── IMPLEMENTATION_PLAN.md          Long-term roadmap
│   ├── ACCOUNTING_LAYER_PLAN.md        Short-term accounting build plan
│   └── SYSTEM_DOCUMENTATION.md        ← this file
├── .env.local                          Environment variables (not committed to git)
├── next.config.ts                      Next.js configuration
├── package.json
└── tsconfig.json
```

---

## 7. Route Map

All routes except `/login` require authentication. Authentication is enforced in `middleware.ts`.

### Auth

| Route | Description |
|-------|-------------|
| `/login` | Email + password login form |

### Properties

| Route | Description |
|-------|-------------|
| `/properties` | List all active properties |
| `/properties/new` | Add a new property |
| `/properties/[id]` | Property detail: info + units list |
| `/properties/[id]/edit` | Edit property details |
| `/properties/[id]/units/[unitId]/leases/new` | Create a new lease for a unit |

### Tenants

| Route | Description |
|-------|-------------|
| `/tenants` | List all active tenants |
| `/tenants/new` | Add a new tenant |
| `/tenants/[id]` | Tenant detail: info + lease summary |
| `/tenants/[id]/edit` | Edit tenant |
| `/tenants/[id]/balance` | Balance & Payments: full ledger history across all leases |

### Leases

| Route | Description |
|-------|-------------|
| `/leases` | List all leases (filterable by status, property) |
| `/leases/new` | Create a new lease |
| `/leases/[id]/edit` | Lease detail: ledger (top) + edit form (below) |
| `/leases/[id]/charges/next-rent` | Charge next rent with auto-detected period |
| `/leases/[id]/charges/new` | Custom charge entry |
| `/leases/[id]/payments/new` | Record a payment (with split methods) |

### Payments

| Route | Description |
|-------|-------------|
| `/payments` | Global payment list across all leases (filterable) |
| `/payments/new` | Record a payment (with lease selection) |

### Accounts (Bank Layer)

| Route | Description |
|-------|-------------|
| `/accounts` | List all financial accounts with balances |
| `/accounts/new` | Add a new account |
| `/accounts/[id]` | Account register: all transactions + running balance |
| `/accounts/[id]/edit` | Edit account details |
| `/accounts/[id]/transactions/new` | Manual transaction entry |
| `/accounts/[id]/transactions/[txId]/edit` | Edit a transaction |
| `/accounts/[id]/import` | CSV bank statement import |

### Reconciliation

| Route | Description |
|-------|-------------|
| `/reconciliation` | Overview: select account to reconcile |
| `/reconciliation/[accountId]` | Side-by-side reconciliation session |

### Categories

| Route | Description |
|-------|-------------|
| `/categories` | List chart of accounts entries |
| `/categories/new` | Add a new category |
| `/categories/[id]/edit` | Edit a category |

### Other

| Route | Description |
|-------|-------------|
| `/distributions` | Partner distribution records |
| `/distributions/new` | Record a distribution |
| `/reports` | Financial reports (P&L, payment history, etc.) |

---

## 8. Server Actions

Server Actions are Next.js functions that run on the server in response to form submissions. They live in `app/actions/`. No separate API layer exists — the UI calls these directly.

### `app/actions/auth.ts`

| Action | Description |
|--------|-------------|
| `login(formData)` | Signs in via `supabase.auth.signInWithPassword`. On success, redirects to `/properties`. |
| `logout()` | Signs out and redirects to `/login`. |

### `app/actions/properties.ts`

| Action | Description |
|--------|-------------|
| `createProperty(formData)` | Insert into `properties`. |
| `updateProperty(id, formData)` | Update `properties` row. |
| `archiveProperty(id)` | Set `archived = true`. |

### `app/actions/tenants.ts`

| Action | Description |
|--------|-------------|
| `createTenant(formData)` | Insert into `tenants`. |
| `updateTenant(id, formData)` | Update `tenants` row. |
| `archiveTenant(id)` | Set `archived = true`. |

### `app/actions/leases.ts`

| Action | Description |
|--------|-------------|
| `createLease(formData)` | Insert lease + lease_tenants join rows. |
| `updateLease(id, propertyId, formData)` | Update lease + sync lease_tenants. |

### `app/actions/payments.ts`

| Action | Description |
|--------|-------------|
| `addCharge(leaseId, formData)` | Insert a charge entry into `lease_ledger_entries`. |
| `chargeNextRent(leaseId, formData)` | Insert a rent charge (and optional late fee). Auto-labels with month name. |
| `recordPayment(leaseId, formData)` | Insert payment entry + split parts into `ledger_payment_parts`. |
| `deleteLedgerEntry(entryId, leaseId)` | Delete a ledger entry by ID. |

### `app/actions/accounts.ts`

| Action | Description |
|--------|-------------|
| `createAccount(formData)` | Insert into `accounts`. |
| `updateAccount(id, formData)` | Update `accounts` row. |
| `toggleAccountActive(formData)` | Toggle `is_active` flag. |

### `app/actions/account_transactions.ts`

| Action | Description |
|--------|-------------|
| `createTransaction(accountId, formData)` | Insert into `account_transactions` with `source = 'manual'`. |
| `updateTransaction(id, accountId, formData)` | Update a transaction. |
| `deleteTransaction(id, accountId)` | Delete a transaction. |
| `importCsvTransactions(accountId, rows)` | Bulk insert with shared `import_batch_id`. |

### `app/actions/categories.ts`

| Action | Description |
|--------|-------------|
| `createCategory(formData)` | Insert into `chart_of_accounts`. |
| `updateCategory(id, formData)` | Update a category. |
| `archiveCategory(id)` | Set `archived = true`. |

### `app/actions/reconciliation.ts`

| Action | Description |
|--------|-------------|
| `createReconciliation(formData)` | Link a ledger entry to an account transaction; set `reconciled = true` on the transaction. |
| `deleteReconciliation(id, transactionId)` | Unlink; set `reconciled = false` on the transaction. |

### `app/actions/distributions.ts`

| Action | Description |
|--------|-------------|
| `createDistribution(formData)` | Insert into `distributions`. |

### `app/actions/reports.ts`

| Action | Description |
|--------|-------------|
| Report queries | Server-side aggregate queries for P&L, payment history, etc. |

---

## 9. Components

All components in `components/`. Client components are marked `'use client'` at the top.

| Component | Type | Purpose |
|-----------|------|---------|
| `AccountForm.tsx` | Client | Create/edit financial account |
| `AddChargeForm.tsx` | Client | Add a manual charge to a lease |
| `ArchiveButton.tsx` | Client | Confirm-on-click archive action |
| `CategoryForm.tsx` | Client | Create/edit chart of accounts entry |
| `CsvImporter.tsx` | Client | CSV upload, column mapping, preview, bulk import |
| `DeleteEntryButton.tsx` | Client | Delete ledger entry with confirm dialog (required because onClick is not allowed in server components in Next.js 16) |
| `DistributionForm.tsx` | Client | Record a partner distribution |
| `LeaseForm.tsx` | Client | Create/edit lease with tenant assignment |
| `LeasesFilter.tsx` | Client | Filter leases list by status/property |
| `NewLeaseForm.tsx` | Client | Lease creation form (used from property/unit context) |
| `NextRentChargeForm.tsx` | Client | Charge next rent: period selector, amount, late fee checkbox |
| `PaymentsFilter.tsx` | Client | Filter payments list |
| `PropertyForm.tsx` | Client | Create/edit property |
| `ReconcileSession.tsx` | Client | Interactive reconciliation UI (left: tenant payments, right: bank transactions) |
| `RecordPaymentForm.tsx` | Client | Record payment with split methods (add/remove method rows) |
| `ReportsForm.tsx` | Client | Report filter form |
| `SelectLeaseForm.tsx` | Client | Lease picker (used on global payments/new) |
| `TenantForm.tsx` | Client | Create/edit tenant |
| `TransactionForm.tsx` | Client | Create/edit account transaction (manual entry) |
| `UnitList.tsx` | Client | Units list on property page with inline add |

---

## 10. Data Flow

### Recording a Tenant Payment

```
User on /leases/[id]/payments/new
        │  (fills out form: date, Zelle $400, Cash App $350)
        ▼
RecordPaymentForm.tsx (Client Component)
        │  handleSubmit → calls server action
        ▼
recordPayment(leaseId, formData) in app/actions/payments.ts
        │
        ├── INSERT lease_ledger_entries (type='payment', amount=750, entry_date=...)
        │
        └── INSERT ledger_payment_parts × 2
            ├── (method='zelle',   amount=400, ledger_entry_id=...)
            └── (method='cashapp', amount=350, ledger_entry_id=...)
        │
        ▼
revalidatePath('/leases/[id]/edit')
redirect('/leases/[id]/edit')
        │
        ▼
User sees updated ledger with new payment and updated running balance
```

### Charging Next Rent

```
User clicks "+ Charge next rent" on lease ledger page
        │
        ▼
/leases/[id]/charges/next-rent (Server Component)
        │  Queries: last rent charge for this lease
        │  Calculates: next period = month after last charge date
        ▼
NextRentChargeForm.tsx pre-filled with:
        - period: next month
        - amount: lease.rent_amount
        - due date: 1st of that month
        - optional late fee checkbox (pre-filled from lease.late_fee_amount)
        │
        ▼
chargeNextRent(leaseId, formData)
        │
        ├── INSERT lease_ledger_entries (type='charge', subtype='rent', description='Rent — July 2026')
        │
        └── (if late fee checked)
            INSERT lease_ledger_entries (type='charge', subtype='late_fee')
        │
        ▼
redirect to /leases/[id]/edit
```

### CSV Bank Statement Import

```
User on /accounts/[id]/import
        │  uploads TD Bank CSV
        ▼
CsvImporter.tsx (Client Component, uses PapaParse)
        │  parses CSV in browser
        │  previews rows, detects potential duplicates
        │  user assigns categories
        ▼
importCsvTransactions(accountId, rows) — Server Action
        │
        ├── Generates import_batch_id (UUID)
        └── Bulk INSERT account_transactions
            (source='csv', import_batch_id=..., reconciled=false)
        │
        ▼
redirect to /accounts/[id] (register shows new transactions)
```

### Reconciliation

```
User on /reconciliation/[accountId]
        │
        ▼
ReconcileSession.tsx (Client Component)
        │  Left panel: lease_ledger_entries WHERE type='payment'
        │              AND no reconciliations record exists
        │  Right panel: account_transactions WHERE reconciled=false
        │               AND amount > 0 (money-in only)
        │
        │  User clicks tenant payment on left
        │  System highlights bank transactions with same amount ± 2 days
        │
        │  User clicks "Match" on a bank transaction
        ▼
createReconciliation(formData) — Server Action
        │
        ├── INSERT reconciliations (lease_ledger_entry_id, account_transaction_id, status='matched')
        └── UPDATE account_transactions SET reconciled=true WHERE id=...
        │
        ▼
Both records are now linked. Tenant payment no longer appears in the
unreconciled list. Bank transaction marked reconciled.
```

---

## 11. Local Development

### Prerequisites

- Node.js 20+
- npm
- Supabase CLI (`brew install supabase/tap/supabase`)

### Setup

```bash
# Clone the repo
git clone git@github.com:mmanoim/managerentals.git
cd managerentals

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local   # (or create manually — see Section 3)

# Run the development server
npm run dev
# App available at http://localhost:3000
```

### Database Migrations

Migrations are applied to the live Supabase database (not a local instance):

```bash
# First time: authenticate CLI
supabase login

# Link to the project
supabase link --project-ref naugzylusfeeizdjgrfb

# Create a new migration
supabase migration new <migration_name>
# Edit the file in supabase/migrations/[timestamp]_<name>.sql

# Apply migrations to production database
supabase db push

# Commit the migration file to git
git add supabase/migrations/
git commit -m "add <migration_name> schema"
```

> **Important:** There is no local Supabase instance. All `supabase db push` commands go directly to production. Always test SQL logic carefully before pushing.

### Build & Deploy

```bash
# Type check + build locally
npm run build

# Deploy: just push to main
git push origin main
# Vercel auto-deploys within ~60 seconds
```

### Key URLs for Development

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Local dev server |
| https://rentals.manoim.com | Production |
| https://supabase.com/dashboard/project/naugzylusfeeizdjgrfb | Supabase dashboard |
| https://vercel.com (mmanoim team) | Vercel dashboard + deploy logs |
| https://github.com/mmanoim/managerentals | Source code |
