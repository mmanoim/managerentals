# ManageRentals — Accounting Layer Plan
## Short-Term Implementation Plan (Phase 4A → 4G)

**Version:** 1.0  
**Created:** June 2026  
**Status:** Phase 4A in progress

---

## Why We're Building This

The tenant ledger (already built) records what tenants owe and what they've declared as paid. But it doesn't connect to real bank accounts.

Every month, Marina manually opens the TD Bank joint account statement, the Cash App transaction history, and the Zelle records — and cross-references them against the tenant ledger entries to confirm:
1. Did every recorded payment actually arrive?
2. Is there any bank credit without a matching tenant record?
3. What is sitting in Cash App or personal accounts waiting to be transferred to the joint account?

This is done in `JointAccountReconciliation.xlsx`.

**The goal of this phase:** bring that reconciliation process into ManageRentals so it is automatic, auditable, and not dependent on a spreadsheet.

---

## Architecture: Option A (Chosen)

We evaluated two options:

**Option B (rejected):** Rebuild the tenant ledger as part of a unified accounting system. Risk: high — would have required migrating all existing data and breaking all current flows.

**Option A (chosen):** Keep the existing tenant ledger exactly as-is. Build a second layer (the bank/account layer) alongside it. Connect the two via a reconciliation table.

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│       TENANT LEDGER (Layer 1)   │     │    BANK/ACCOUNT LAYER (Layer 2)  │
│  (already built, stays as-is)   │     │      (being built now)            │
│                                 │     │                                   │
│  lease_ledger_entries           │     │  account_transactions             │
│  - rent charges                 │     │  - bank deposits                  │
│  - late fee charges             │     │  - Cash App credits               │
│  - payment entries              │     │  - expense payments               │
│  - by method (Zelle, CashApp…)  │     │  - transfers between accounts     │
└───────────────┬─────────────────┘     └──────────────┬────────────────────┘
                │                                       │
                └──────────────┬────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    reconciliations   │
                    │  Links a tenant      │
                    │  payment entry to    │
                    │  a bank transaction  │
                    └─────────────────────┘
```

This means:
- Nothing breaks in the existing lease/tenant/payment UI
- The accounting layer can be built and tested independently
- Reconciliation is opt-in — an unreconciled system still works; reconciliation just adds confidence

---

## Chart of Accounts

The chart of accounts provides standardized income/expense categories across all properties and transactions.

### Account Number Ranges

| Range | Type | Description |
|-------|------|-------------|
| 1000–1999 | Asset | Bank accounts, cash, receivables |
| 2000–2999 | Liability | Loans, security deposits held |
| 3000–3999 | Equity | Owner equity, retained earnings |
| 4000–4999 | Income | All revenue sources |
| 5000–5999 | Expense | All operating expenses |
| 6000–6999 | Transfer | Inter-account transfers (not P&L) |

### Income Accounts (4000s)

| Code | Name | Notes |
|------|------|-------|
| 4010 | Rental Income — 14 Cottage Unit 1 | Section 8 / HA payments go here |
| 4020 | Rental Income — 14 Cottage Unit 2 | |
| 4030 | Rental Income — 14 Cottage Unit 3 | |
| 4040 | Rental Income — [next property] | Expand as portfolio grows |
| 4050 | Rental Income — [next property] | |
| 4060 | Rental Income — [next property] | |
| 4070 | Rental Income — [next property] | |
| 4100 | Late Fees | All late fee income, all properties |
| 4200 | Security Deposit Forfeited | When tenant forfeits deposit |

> **Note:** Account 4300 does not exist. Housing Authority (Section 8) payments are income for the specific unit they pay for — they go into 4010–4070 alongside regular tenant payments.

### Expense Accounts (5000s)

| Code | Name | Notes |
|------|------|-------|
| 5010 | Repairs & Maintenance | General repairs, labor |
| 5020 | Landscaping | Lawn care, snow removal |
| 5030 | Utilities | Water, electric, gas (owner-paid) |
| 5040 | Insurance | All property insurance premiums |
| 5050 | Property Management Fees | If any |
| 5060 | Legal & Professional | Attorney, CPA, filing fees |
| 5070 | Advertising | Vacancy advertising |
| 5080 | Office & Admin | Supplies, software |
| 5090 | Travel | Property-related mileage/travel |
| 5100 | Mortgage Interest | Deductible interest only |
| 5110 | Property Taxes | Annual real estate taxes |
| 5120 | Depreciation | Non-cash, for reporting |
| 5130 | HOA Fees | If applicable |
| 5140 | Cleaning | Turnover cleaning between tenants |
| 5150 | Capital Improvements | Non-deductible, capitalized |

### Transfer Accounts (6000s)

| Code | Name | Notes |
|------|------|-------|
| 6010 | Transfer — Cash App to Joint | Moving Cash App balance to bank |
| 6020 | Transfer — Venmo to Joint | Moving Venmo balance to bank |
| 6030 | Transfer — Personal to Joint | Moving from personal bank to joint |
| 6040 | Transfer — Joint to Personal | Drawing from joint to personal |

---

## Accounts (Financial Accounts to Track)

These are the real-world accounts whose transactions we will import and track:

| Name | Type | Owner | Notes |
|------|------|-------|-------|
| TD Bank Joint Checking | bank | joint | Primary deposit account; bank statements imported via CSV |
| Marina — Personal Checking | bank | marina | Occasional property-related expenses |
| Jacob — Personal Checking | bank | jacob | Occasional property-related expenses |
| Cash App — Marina | payapp | marina | Many tenant payments arrive here |
| Cash App — Jacob | payapp | jacob | |
| Venmo — Marina | payapp | marina | |
| Zelle | payapp | joint | Tied to joint bank account |
| Cash on Hand | cash | joint | Physical cash collected from tenants |

> Account types: `bank`, `payapp`, `cash`, `credit`  
> Owner values: `joint`, `marina`, `jacob`

---

## Database Schema

### Table 1: `chart_of_accounts`

```sql
CREATE TABLE chart_of_accounts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,          -- e.g. '4010'
  name       text NOT NULL,                 -- e.g. 'Rental Income — 14 Cottage Unit 1'
  type       text NOT NULL                  -- 'income' | 'expense' | 'transfer' | 'equity'
               CHECK (type IN ('income','expense','transfer','equity')),
  parent_id  uuid REFERENCES chart_of_accounts(id),  -- for sub-accounts
  archived   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Table 2: `accounts`

```sql
CREATE TABLE accounts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  type             text NOT NULL
                     CHECK (type IN ('bank','payapp','cash','credit')),
  institution      text,                    -- e.g. 'TD Bank', 'Cash App'
  last_four        text,                    -- last 4 digits of account number
  owner            text NOT NULL DEFAULT 'joint'
                     CHECK (owner IN ('joint','marina','jacob')),
  opening_balance  numeric(12,2) NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);
```

### Table 3: `account_transactions`

```sql
CREATE TABLE account_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES accounts(id),
  date            date NOT NULL,
  description     text NOT NULL,
  amount          numeric(12,2) NOT NULL,   -- positive = credit (money in), negative = debit (money out)
  category_id     uuid REFERENCES chart_of_accounts(id),
  property_id     uuid REFERENCES properties(id),  -- optional, for expense allocation
  notes           text,
  source          text NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('manual','csv','pdf')),
  import_batch_id text,                     -- groups all rows from one CSV upload
  reconciled      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

### Table 4: `reconciliations`

```sql
CREATE TABLE reconciliations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_ledger_entry_id   uuid REFERENCES lease_ledger_entries(id),
  account_transaction_id  uuid REFERENCES account_transactions(id),
  status                  text NOT NULL DEFAULT 'matched'
                            CHECK (status IN ('matched','partial','exception')),
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now()
);
```

---

## Phase 4A — Database Schema 🔄 IN PROGRESS

**Goal:** Create the 4 tables above in Supabase via a tracked CLI migration.

**Why CLI migrations (not dashboard):** SQL files committed to git mean the schema change is reviewable, reversible, and reproducible. The dashboard is click-based with no audit trail.

### Steps

1. Authenticate Supabase CLI  
   User must run: `supabase login`

2. Link to project  
   `supabase link --project-ref naugzylusfeeizdjgrfb`

3. Create migration file  
   `supabase migration new accounting_schema`  
   File: `supabase/migrations/[timestamp]_accounting_schema.sql`

4. Write SQL (4 CREATE TABLE statements + CoA seed data)

5. Push to Supabase  
   `supabase db push`

6. Commit migration file to GitHub  
   Vercel auto-deploys; the app immediately has access to the new tables.

### Seed Data

After creating the tables, seed `chart_of_accounts` with the full CoA listed above (income 4010–4200, expenses 5010–5150, transfers 6010–6040).

---

## Phase 4B — Accounts Setup Page ⬜

**Route:** `/accounts`

**What it shows:**
- List of all accounts (bank accounts, payment apps, cash)
- Type badge (Bank, Payment App, Cash), owner label (Joint / Marina / Jacob)
- Current balance (calculated from opening_balance + sum of transactions)
- Active/inactive toggle
- Link to account register

**Actions:**
- Add new account
- Edit account details (name, institution, last four digits)

---

## Phase 4C — Account Register ⬜

**Route:** `/accounts/[id]`

**What it shows:**
- All transactions for this account, chronological, with running balance
- Columns: Date | Description | Category | Amount | Balance | Reconciled ✓
- Filter: date range, category, reconciled/unreconciled
- Running balance recomputes from opening_balance

**Actions:**
- Click a transaction to edit or delete
- "Add transaction" button → Phase 4D form

---

## Phase 4D — Manual Transaction Entry ⬜

**Route:** `/accounts/[id]/transactions/new` (also accessible from lease payment flow)

**Fields:**
- Date (required)
- Description (required)
- Amount (required; positive = money in, negative = money out)
- Category (dropdown from `chart_of_accounts`)
- Property (optional — for expense allocation)
- Notes (optional)
- Source: manual (default for this form)

**Why manual entry matters:** Not all transactions come from a bank CSV. Cash payments, inter-account transfers, and manual corrections all need to be entered by hand.

---

## Phase 4E — CSV Bank Statement Import ⬜

**Route:** `/accounts/[id]/import`

**Flow:**
1. Upload CSV file (TD Bank format, or user-mapped columns)
2. Preview: show parsed rows before committing
3. Auto-detect duplicates by (date + description + amount)
4. Column mapping: if bank format is unfamiliar, let user map "Date", "Description", "Amount" columns
5. Assign a category to each row (or leave blank for manual categorization later)
6. Commit: insert rows with `source = 'csv'` and a shared `import_batch_id`
7. Summary: X rows imported, Y duplicates skipped

**Import batch:** All rows from one upload share an `import_batch_id` (a UUID). This allows undoing an import by deleting all rows with that batch ID.

---

## Phase 4F — Reconciliation UI ⬜

**Route:** `/reconciliation`

**The problem it solves:** A tenant records a Zelle payment in the tenant ledger on March 5. The bank statement shows a Zelle credit on March 6 for the same amount. These are the same money — but the system has two separate records. Reconciliation links them so we know this payment is confirmed.

**What it shows:**

Left panel — Unreconciled tenant payments (from `lease_ledger_entries` where type = 'payment' and no reconciliation record exists)

Right panel — Unmatched bank transactions (from `account_transactions` where reconciled = false and amount > 0)

**Workflow:**
1. Select a tenant payment on the left
2. The system auto-highlights likely bank transaction matches (same amount ± 2 days)
3. Click to link → creates a `reconciliations` record, marks `account_transactions.reconciled = true`
4. If amounts don't match: mark as `partial` or `exception` and add a note

**Status indicators:**
- Matched ✓ (green) — tenant payment linked to bank transaction
- Unmatched ⚠ (yellow) — tenant payment recorded, no bank match yet
- Exception ✗ (red) — linked but amounts differ; needs review

---

## Phase 4G — Reconciliation & Cash Flow Reports ⬜

**Reports:**

| Report | Description |
|--------|-------------|
| Unreconciled Payments | All tenant payments without a bank match — money still "in transit" |
| Unmatched Bank Credits | Bank credits not tied to a tenant record — may indicate unrecorded income |
| Monthly Cash Flow | Income vs. expenses per account, per month |
| Property P&L | Income vs. expenses per property for a date range |

All exportable to CSV.

---

## Dependencies & Sequencing

```
Phase 4A (DB schema)
    └── Phase 4B (accounts list)
            └── Phase 4C (account register)
                    ├── Phase 4D (manual entry)
                    └── Phase 4E (CSV import)
                                └── Phase 4F (reconciliation UI)
                                            └── Phase 4G (reports)
```

Each phase is a deployable increment — the system works at the end of every phase. You can stop after 4D and have manual transaction entry without reconciliation; you can stop after 4E and have import without reconciliation. Reconciliation (4F) is the culmination but not a prerequisite for the accounting layer being useful.

---

## Definition of Done for This Phase

The accounting layer is complete when:

1. Marina can log into the app and see all financial accounts under `/accounts`
2. She can upload a TD Bank CSV and see the transactions appear in the joint checking register
3. She can view a list of unreconciled tenant payments (Zelle, Cash App, etc.) next to unmatched bank credits and click to link them
4. The spreadsheet `JointAccountReconciliation.xlsx` is no longer needed for monthly reconciliation
5. A monthly P&L report per property can be generated from within the app
