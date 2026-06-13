# Implementation Plan
## Rental Property Management System (ManageRentals)

**Version:** 1.0  
**Date:** June 2026  
**Based on PRD:** v1.3

---

## Overview

The system is built in 7 phases. Each phase delivers a fully working, deployable increment. No phase leaves the system in a broken or partial state — at the end of every phase, what exists works end-to-end.

**Guiding principle:** Get a real URL in the browser as early as possible. Infrastructure and auth first, then data, then features, then reports.

---

## Phase 1 — Foundation, Authentication & Properties/Units
> **Goal:** A real, live web app at a URL where a user can log in and manage properties and units.

### Step 1.1 — Project Scaffolding
- Initialize **Next.js 14** project with App Router (`/app` directory)
- Configure **TypeScript** and **Tailwind CSS**
- Connect to the existing **Supabase** project (`managerentals`)
- Push to the existing **GitHub** repo (`mmanoim/managerentals`)
- Deploy to **Vercel** — auto-deploy on every push to `main`
- Set up environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Deliverable:** A live URL on Vercel showing a placeholder homepage.

---

### Step 1.2 — Database Schema (Phase 1 Tables)
Design and apply the following tables in Supabase:

#### `organizations`
Placeholder for future multi-user support. Every record belongs to an org from day one.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | text | e.g. "KHI Properties" |
| created_at | timestamptz | |

#### `properties`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| org_id | uuid | FK → organizations |
| address | text | Full street address |
| city | text | |
| state | text | |
| zip | text | |
| purchase_date | date | |
| purchase_price | numeric | |
| num_units | integer | |
| notes | text | Optional |
| archived | boolean | Soft delete |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `units`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| property_id | uuid | FK → properties |
| unit_label | text | e.g. "Unit 1", "Apt 2A", "Garage" |
| monthly_rent | numeric | Current asking rent |
| archived | boolean | Soft delete |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Deliverable:** Tables created in Supabase with RLS (Row Level Security) enabled.

---

### Step 1.3 — Authentication
- Enable **Supabase Auth** with email/password provider
- Create a single admin user account (marina@manoim.com) directly in Supabase dashboard
- Build `/login` page — email + password form, no self-serve signup
- Implement **middleware** to protect all routes: unauthenticated users redirect to `/login`
- Session persistence via Supabase auth cookies (stay logged in across browser sessions)
- Simple logout button in the nav

**Deliverable:** Login page at the live URL. Unauthenticated access blocked everywhere else.

---

### Step 1.4 — App Shell & Navigation
- Top navigation bar: logo, nav links (Properties, ← more added per phase), user menu + logout
- Sidebar or tab navigation within a property detail view
- Responsive layout (desktop-first, readable on tablet)
- Loading states and error boundaries

**Deliverable:** Consistent UI shell that all future features slot into.

---

### Step 1.5 — Properties Management
- `/properties` — list of all properties with address, number of units, and status (active/archived)
- `/properties/new` — form to add a property
- `/properties/[id]` — property detail page showing summary info and list of units
- `/properties/[id]/edit` — edit property details
- Archive a property (soft delete — hidden from list but data preserved)

**Deliverable:** Full CRUD for properties.

---

### Step 1.6 — Units Management
- Units are managed within the property detail page
- Add / edit / archive units inline on `/properties/[id]`
- Each unit shows: label, monthly rent, current occupancy status (vacant/occupied — populated in Phase 2)

**Deliverable:** Full CRUD for units, scoped to their property.

---

### Phase 1 Complete Checklist
- [ ] Live URL on Vercel
- [ ] Login works with email + password
- [ ] Logged-out users cannot access any page
- [ ] Can create, view, edit, archive properties
- [ ] Can create, view, edit, archive units within a property
- [ ] All data persisted in Supabase

---

## Phase 2 — Tenants & Leases
> **Goal:** Track who lives in each unit, their lease terms, and security deposits.

### Key deliverables
- Tenant directory linked to units
- Lease records per tenant (start/end, rent amount, renewal date)
- Full lease history per unit (renewals, rent changes)
- Security deposit tracking (received, account held in, returned)
- Unit status auto-updates to Occupied/Vacant based on active lease

### New tables
- `tenants` — name, contact info, move-in date, linked to a unit
- `leases` — start date, end date, monthly rent, renewal date, FK to tenant + unit
- `security_deposits` — amount, received date, account, returned date + amount

---

## Phase 3 — Accounts & Chart of Accounts
> **Goal:** Define all financial accounts and expense/income categories used in the system.

### Key deliverables
- Account management: create accounts with type (Business Checking, Personal, HELOC, CC, Digital Wallet, etc.)
- Mark accounts as Personal or Business
- Flag accounts as deposit destinations (multiple allowed)
- Chart of accounts: configurable list of income/expense categories
- Seed default categories from existing Excel data

### New tables
- `accounts` — name, type, personal/business flag, is_deposit_destination, starting balance
- `account_types` — lookup table (extensible)
- `categories` — name, type (income/expense), active flag

---

## Phase 4 — Transactions & Payment Flow
> **Goal:** Record all money in and out, and track the full lifecycle from tenant payment to bank deposit.

### Key deliverables
- Transaction entry form: date, property, unit, account, category, amount, memo, payment method
- Payment methods: Check, Bank Transfer, Cash, Cash App, Venmo, Zelle, Other
- Deposit status on income transactions: `received` → `deposited`
- Select destination account when marking as deposited
- **Undeposited Payments Dashboard** — live view of all received-but-not-deposited payments
- Bulk deposit action: select multiple payments, pick destination, mark all deposited

### New tables
- `transactions` — all income and expense records
- `payment_methods` — configurable lookup list

---

## Phase 5 — Insurance & Renewals Dashboard
> **Goal:** Track all insurance policies and surface all upcoming renewals in one place.

### Key deliverables
- Insurance policy management per property (type, provider, policy #, premium, dates)
- Premium payments linked to transaction ledger
- **Renewals Dashboard** — unified view of expiring leases + expiring insurance policies
- Color-coded countdown: red ≤ 30 days, yellow ≤ 60 days

### New tables
- `insurance_policies` — property, type, provider, premium, start/renewal date, status
- `insurance_types` — configurable lookup (Landlord, Liability, Umbrella, Flood, etc.)

---

## Phase 6 — Late Fees, Collection Notes & Outstanding Payments
> **Goal:** Track overdue rent, assess late fees, document collection activity, and surface who owes what.

### Key deliverables
- Late payment flagging: tenant marked overdue when rent not received by due date
- Late fee recording: amount, date, reason — posted to transaction ledger as income
- Collection notes: timestamped log per tenant, full history preserved
- **Outstanding Payments view** — all tenants with any balance due, days overdue, total owed

### New tables
- `late_fees` — tenant, amount, date assessed, reason, linked transaction
- `collection_notes` — tenant, date, note text, logged_by

---

## Phase 7 — Reports
> **Goal:** Turn all the data into actionable financial summaries.

### Reports to build (all exportable to CSV)

| Report | Source Data |
|---|---|
| Monthly P&L per Property | Transactions grouped by property + month |
| Tenant Payment History | Transactions + late fees per tenant |
| Outstanding Payments | Overdue tenants + balances |
| Collection Notes | collection_notes per tenant — also PDF export |
| Year-End Summary | Annual totals per property for tax prep |

---

## Phase 8 — Data Migration (Future)
> Import historical data from KHI_accting.xlsm into the live system.

- Map Excel sheet columns to database schema
- Write Python import script (using openpyxl, already installed)
- Dry-run mode to preview what will be imported before committing
- Import sequence: properties → units → tenants → leases → accounts → transactions

---

## Technology Decisions

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | File-based routing, server components, built-in API routes |
| Database | Supabase (PostgreSQL) | Already provisioned, handles auth + RLS + realtime |
| Auth | Supabase Auth | Email/password, session cookies, RLS integration |
| Styling | Tailwind CSS | Utility-first, fast to build, easy to maintain |
| Hosting | Vercel | Zero-config, auto-deploys from GitHub |
| Language | TypeScript | Type safety across frontend and database queries |

---

## Development Conventions

- **One PR per feature** — each step in a phase is a separate pull request
- **Database migrations** as SQL files in `/supabase/migrations` — tracked in git
- **No hardcoded data** — account types, payment methods, categories are always database-driven
- **Soft deletes everywhere** — archive flag, never hard delete user data
- **`org_id` on every table** — multi-user support is a permission layer, not a schema rewrite
