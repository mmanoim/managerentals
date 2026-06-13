# ManageRentals — Full Implementation Plan
## Long-Term Roadmap

**Version:** 2.0  
**Updated:** June 2026  
**Product:** rentals.manoim.com  
**Stack:** Next.js 16, Supabase (PostgreSQL), Vercel, TypeScript, Tailwind CSS

---

## Context & Purpose

ManageRentals replaces a multi-sheet Excel workbook (`KHI_accting.xlsm` + `JointAccountReconciliation.xlsx`) used to manage a portfolio of residential rental properties owned by Marina and Jacob.

The core problem being solved is **tracking the full lifecycle of a rent payment** — from the moment a tenant pays (in any form: Zelle, Cash App, check, cash) through to the moment that money lands in the joint bank account — with full visibility at every step.

Secondary purposes:
- Maintain tenant and lease records per unit
- Track all property income and expenses against real bank accounts
- Identify unreconciled payments (money received but not yet confirmed in bank)
- Produce financial reports for tax preparation

---

## Architecture: Two-Layer Model

The system deliberately uses **two parallel layers** that are linked via reconciliation:

### Layer 1 — Tenant Ledger (built ✅)
Records what tenants owe and what they've paid, per lease:
- Charges: rent, late fees, adjustments
- Payments: recorded by method (Zelle, Cash App, check, cash, Venmo)
- Running balance per lease

This layer is the **tenant-facing truth**: it answers "does this tenant owe us money?"

### Layer 2 — Bank/Account Layer (being built 🔄)
Records actual transactions in real financial accounts:
- Bank checking accounts (joint, personal)
- Payment app accounts (Cash App, Zelle, Venmo)
- Cash
- Expense transactions (repairs, utilities, insurance, etc.)

This layer is the **accounting truth**: it answers "what actually moved through our accounts?"

### Reconciliation Bridge (planned ⬜)
Links tenant payment entries to actual bank transactions, surfacing:
- Payments received by tenants but not yet in the bank
- Bank credits that haven't been matched to a tenant payment
- Discrepancies (amount differences, missing entries)

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete and deployed |
| 🔄 | In progress (current sprint) |
| ⬜ | Planned, not started |

---

## Phase 1 — Foundation, Auth, Properties & Units ✅ COMPLETE

All items below are live at rentals.manoim.com.

- Next.js 16 project with App Router, TypeScript, Tailwind CSS
- Supabase project `naugzylusfeeizdjgrfb` connected
- GitHub repo `mmanoim/managerentals` → auto-deploys to Vercel on every push to `main`
- Email + password login (marina@manoim.com)
- Session persistence; all routes protected
- Properties: create, view, edit, archive
- Units: create, view, edit, archive (scoped to property)

---

## Phase 2 — Tenants & Leases ✅ COMPLETE

- Tenant directory: create, edit, archive
- Leases: create, edit, multiple leases per unit for rent change history
- Lease tenants: multiple tenants per lease (primary + secondary)
- Security deposit tracking (amount, returned flag, return date)
- Lease status: active, ended, pending
- Lease detail page (`/leases/[id]/edit`) with ledger above the edit form

---

## Phase 3 — Tenant Ledger ✅ COMPLETE

The core payment tracking layer (Layer 1 above).

**Charges:**
- Rent charge with period label (e.g., "Rent — June 2026")
- Late fee charge
- Adjustment charge
- "Charge next rent" button: auto-detects next period from last charge, pre-fills amount from lease, optional late fee checkbox

**Payments:**
- Record payment with multiple split methods (Zelle + Cash App in one transaction)
- Methods: Zelle, Cash App, Venmo, check, cash
- Reference number per payment part

**Ledger display:**
- Running balance column
- Color-coded: red = balance due, green = credit
- Delete entry with confirm dialog

**Tenant view:**
- Balance & Payments screen (`/tenants/[id]/balance`)
- Summary cards: Total Charged, Total Paid, Balance Due
- Per-lease ledger sorted oldest → newest

**Data imported:**
- 20 historical Zelle payments for 14 Cottage Unit 1 (2022–2025)
- Split across 3 leases (3 rent rate periods: $700, $750, $800/mo)

---

## Phase 4 — Accounting Layer 🔄 IN PROGRESS

See `ACCOUNTING_LAYER_PLAN.md` for the detailed short-term plan.

**Why this phase exists:**  
The tenant ledger records what was paid, but doesn't connect to real bank accounts. Every month, Marina manually cross-references the joint account bank statement against Cash App and Zelle records to confirm that all tenant payments actually landed. This phase builds a proper accounting layer so that reconciliation is done inside the system, not in a spreadsheet.

### Phase 4A — Database Schema 🔄 IN PROGRESS
Four new tables in Supabase:
- `chart_of_accounts`
- `accounts`
- `account_transactions`
- `reconciliations`

Full schema in `ACCOUNTING_LAYER_PLAN.md`.

### Phase 4B — Accounts Setup Page ⬜
`/accounts` — list and manage financial accounts (bank accounts, payment apps, cash).

### Phase 4C — Account Register ⬜
`/accounts/[id]` — full transaction register for one account, running balance, filter by date/category.

### Phase 4D — Manual Transaction Entry ⬜
Form to manually enter a bank/account transaction (income or expense).

### Phase 4E — CSV Bank Statement Import ⬜
Upload a CSV from the bank (TD Bank, joint account) and auto-parse into `account_transactions`. Duplicate detection on import.

### Phase 4F — Reconciliation UI ⬜
Side-by-side view: tenant ledger payments on the left, unmatched bank transactions on the right. One-click to link them. Visual status: matched / unmatched / exception.

### Phase 4G — Reconciliation Reports ⬜
- Unreconciled tenant payments (received but not confirmed in bank)
- Unmatched bank credits (in bank but not tied to a tenant)

---

## Phase 5 — Insurance & Renewals Dashboard ⬜

**Why:** Insurance policies on rental properties expire and renew annually. A lapsed policy is a serious liability. Currently tracked in spreadsheets.

- Insurance policy management per property (type, provider, policy #, premium, start/renewal dates)
- Premium payments linked to the account transaction ledger
- Renewals Dashboard: unified view of expiring leases + expiring insurance policies
- Color-coded countdown: red ≤ 30 days, yellow ≤ 60 days

**New tables:** `insurance_policies`, `insurance_types`

---

## Phase 6 — Collection Notes ⬜

**Why:** When a tenant is late, there are usually phone calls and follow-ups. Currently these are tracked informally. A timestamped log protects the owner legally and makes handoff to an attorney easier.

- Timestamped collection notes per tenant (date, note text)
- Full note history preserved
- Outstanding Payments view: all tenants with any balance due, days overdue, total owed
- Collection Notes PDF export per tenant (for legal use)

**New tables:** `collection_notes`

---

## Phase 7 — Financial Reports ⬜

**Why:** The year-end reports are currently built manually in Excel by going through 12 months of transactions. This phase generates them automatically.

| Report | Description |
|--------|-------------|
| Monthly P&L per Property | Income vs. expenses by category, per property, per month |
| Tenant Payment History | All ledger entries per tenant; highlights missed payments and late fees |
| Outstanding Payments | All tenants with a balance due; days overdue, total owed |
| Year-End Summary | Annual income/expense totals per property for tax prep (Schedule E) |
| Reconciliation Status | All tenant payments vs. bank — matched, unmatched, exceptions |

All reports exportable to CSV. Collection Notes also exportable to PDF.

---

## Phase 8 — Data Migration from Excel ⬜

**Why:** Historical financial data (2020–2024) lives in `KHI_accting.xlsm`. Once the system is stable, this data needs to come in so all reporting covers the full history.

- Map Excel columns to database schema
- Python import script (using openpyxl)
- Dry-run mode: preview before committing
- Import sequence: properties → units → tenants → leases → accounts → transactions
- Idempotent: safe to re-run

---

## Future Backlog (No Timeline)

- **Multi-user access:** Individual logins for Marina, Jacob, and bookkeeper with role-based permissions. Architecture is already multi-user ready (`org_id` pattern).
- **Bank feed integration:** Connect via Plaid for automatic transaction import instead of manual CSV upload.
- **Tenant portal:** Tenant-facing rent payment and maintenance request portal.
- **Document storage:** Attach lease PDFs, receipts to records.
- **Mobile:** Responsive PWA or native app for logging cash payments on-the-go.

---

## Technology Decisions

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 16 (App Router) | Server components, server actions, file-based routing |
| Database | Supabase (PostgreSQL) | Already provisioned; handles auth, RLS, PostgREST |
| Auth | Supabase Auth | Email/password, session cookies |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| Hosting | Vercel | Auto-deploys from GitHub `main` branch |
| Language | TypeScript | Type safety across frontend and DB queries |

## Key Conventions

- **Server actions** for all data mutations (no separate API routes)
- **Database migrations** as SQL files in `/supabase/migrations/` — tracked in git
- **Soft deletes** everywhere — `archived` flag, data never destroyed
- **No hardcoded values** — payment methods, account types, categories are data, not code
- **Vercel auto-deploys** on every push to `main`; never push broken code
