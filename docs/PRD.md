# Product Requirements Document
## Rental Property Management System (ManageRentals)

**Version:** 1.3 — MVP  
**Date:** June 2026  
**Status:** Draft

---

## 1. Purpose & Problem Statement

The system replaces a multi-sheet Excel workbook used to manage a portfolio of residential rental properties. The core problem it solves is **tracking the full lifecycle of a rent payment** — from the moment a tenant pays (in any form) to the moment that money lands in a designated deposit account (joint or business) — with full visibility into what has been received, what is still in transit, and what has been deposited.

Secondary purposes:

- Track all property-related income and expenses across multiple accounts
- Maintain tenant records and lease status
- Produce financial reports for internal use and tax preparation

---

## 2. Users

**MVP:** Single user, single login. No self-serve registration, password reset, or billing.

**Architecture must support (future):** Multiple users with individual logins and role-based access (e.g., partner, bookkeeper, read-only accountant).

---

## 3. Core Domain Concepts

### 3.1 Properties & Units
A **Property** is a physical address. Each property has one or more **Units** (apartments, garage, house). Properties are the top-level organizing entity for all financial activity.

### 3.2 Accounts
An **Account** represents any financial account or payment vessel used in the business. Accounts have a **type** that controls how they appear in reports.

| Account Type | Examples |
|---|---|
| Business Checking | TD Bank operating account |
| Joint Account | Shared partner deposit account |
| Personal Checking | Partner's personal bank |
| Line of Credit | HELOC |
| Credit Card | Business or personal CC |
| Security Deposits | Held in escrow/separate account |
| Loan | SBA loan, mortgage |
| Cash | Physical cash on hand |
| Digital Wallet | Cash App, Venmo, Zelle |

Accounts are marked as **Personal** or **Business**. Any **Business** or **Joint** account can be designated as a deposit destination — payments can be consolidated into a joint partner account or directly into a business checking account, depending on the workflow.

### 3.3 Tenants
A **Tenant** is linked to a specific Unit. Each tenant record holds contact info, lease dates, and a full payment history.

### 3.4 Transactions
A **Transaction** is any financial event — income or expense — associated with a property, unit, account, and date. Transactions have an **expense category** (from a configurable chart of accounts) and a **payment method**.

### 3.5 Payment Flow (Critical)
This is the defining workflow of the system:

```
Tenant pays
    └── Payment Method: Cash | Check | Venmo | Cash App | Zelle | Bank Transfer | Other
            └── Received into: Personal account | Cash | Digital wallet
                    └── Status: RECEIVED (not yet deposited)
                            └── Deposited to: Joint Account | Business Account
                                    └── Status: DEPOSITED ✓
```

Every incoming payment has a **deposit status**: `received` or `deposited`. The system must make it easy to see what is sitting in someone's personal account or digital wallet waiting to be moved.

### 3.6 Home Improvements
Capital expenses tied to a specific property (repairs, renovations). Tracked separately from operating expenses for tax purposes (depreciation vs. deduction).

### 3.7 Loans
Loan accounts track principal balance, draws, and payments (e.g., SBA loan, HELOC draws).

### 3.8 Insurance Policies
An **Insurance Policy** is tied to a specific property and covers a defined period. The system tracks the policy details, premium payments, and renewal dates so nothing lapses unnoticed.

| Field | Description |
|---|---|
| Property | Which property the policy covers |
| Insurance Type | Landlord/Dwelling, Liability, Umbrella, Flood, Workers Comp, etc. |
| Provider | Insurance company name |
| Policy Number | Reference number |
| Premium Amount | Annual or monthly premium |
| Payment Frequency | Monthly, Quarterly, Semi-Annual, Annual |
| Policy Start Date | Coverage begin date |
| Renewal Date | When the policy must be renewed |
| Status | Active, Expired, Cancelled |

Premium payments are linked to the transaction ledger (recorded as an expense against the property). Renewal dates surface in the **Renewals Dashboard** alongside lease renewals.

### 3.9 Lease Agreements & Renewals
A **Lease** is the formal agreement between the owner and a tenant for a unit. Each lease has a start date, end date, rent amount, and renewal date. The system tracks the full history of leases per unit — including renewals and rent increases over time — so the lifecycle of each unit is always visible.

---

## 4. MVP Features

### 4.1 Authentication
- Email + password login for a single user account
- Session persistence (stay logged in)
- No self-serve signup or password reset in MVP (admin resets manually)

### 4.2 Property & Unit Management
- Create/edit/archive properties (address, purchase date, purchase price, number of units)
- Create/edit units per property (unit number/label, rent amount)
- View per-property summary (total income, total expenses, active tenants)

### 4.3 Account Management
- Create/edit accounts with type (see 3.2) and personal/business flag
- Mark any Business or Joint account as a **deposit destination** (multiple allowed)
- View running balance per account
- Reconciliation workflow: mark transactions as reconciled for a date range, compare to statement balance

### 4.4 Tenant & Lease Management
- Create/edit tenants linked to a unit (name, contact info, move-in date)
- Each tenant has a **Lease record**: start date, end date, monthly rent, security deposit amount
- Full lease history per unit (track renewals and rent changes over time)
- Security deposit tracking: received date, amount, account held in, return date and amount
- Full payment history per tenant
- **Late payments:** when rent is not received by the due date, the system flags the tenant as overdue
- **Late fees:** record a late fee charge against a tenant (amount, date assessed, reason); late fees appear in the tenant's ledger and in the transaction register as income
- **Collection notes:** free-text notes attached to a tenant record to document collection activity (date of note, note text, logged by); full note history preserved per tenant

### 4.5 Transaction Entry
- Record income or expense with: date, property, unit, account, category, amount, memo, payment method
- Payment method options: Check, Bank Transfer, Cash, Cash App, Venmo, Zelle, Other (user-defined label)
- For income transactions: set deposit status (`received` / `deposited`) and select destination account when depositing
- Edit and delete transactions
- Bulk deposit: mark multiple received payments as deposited, selecting the destination account (joint or business)

### 4.6 Chart of Accounts
- Configurable list of income and expense categories (seeded from existing data: Rental Income, Late Fee, Landscaping, Utilities, Repairs, Interest Expense, etc.)
- Categories tagged as Income or Expense
- Admin can add/rename categories

### 4.7 Insurance Management
- Create/edit insurance policies per property (see fields in 3.8)
- Record premium payments linked to the transaction ledger
- View all policies with current status (Active / Expiring Soon / Expired)

### 4.8 Renewals Dashboard
A single dashboard showing all upcoming and overdue renewals across both lease agreements and insurance policies.

| Column | Description |
|---|---|
| Type | Lease or Insurance |
| Property / Unit | What it applies to |
| Tenant / Provider | Tenant name or insurance company |
| Renewal Date | When action is required |
| Days Until Renewal | Countdown; highlighted red if ≤ 30 days, yellow if ≤ 60 days |
| Status | Current / Expiring Soon / Expired |

### 4.9 Undeposited Payments Dashboard
- Real-time view of all payments in `received` status
- Grouped by: account/wallet they are sitting in
- Shows: tenant, property, amount, date received, days pending
- One-click to mark as deposited, with dropdown to select destination account (joint or business)

### 4.10 Reports

| Report | Description |
|---|---|
| Monthly P&L per Property | Income vs. expenses by category, per property, per month |
| Undeposited Payments | Live dashboard (see 4.9) |
| Tenant Payment History | All payments for a tenant; highlights missed/late payments and assessed late fees |
| Outstanding Payments | All tenants with a balance due: rent overdue, late fees unpaid, or partial payments; shows days overdue and total amount owed |
| Collection Notes | Per-tenant log of all collection activity — date, note, any late fees assessed, and current balance; exportable as a PDF summary for each tenant |
| Year-End Summary | Annual income and expense totals per property, formatted for tax prep |

All reports exportable to CSV. Collection Notes report also exportable to PDF.

---

## 5. Architecture Principles

These decisions ensure the system can grow without being rebuilt.

### 5.1 Multi-tenancy Ready
The data model includes a `user_id` / `organization_id` on all records from day one. Adding team members later is a permission layer, not a schema change.

### 5.2 Extensible Account Types
Account types are stored as an enum/lookup table, not hardcoded. New account types (e.g., PayPal, Wise) can be added without schema migration.

### 5.3 Extensible Payment Methods
Payment methods are a configurable list (not hardcoded), so new methods can be added as a data change.

### 5.4 Audit Trail
All records include `created_at`, `updated_at`. Soft deletes (archived, not hard-deleted) for properties, units, tenants, and accounts.

### 5.5 API-First
Business logic lives in the backend/database layer. The frontend calls an API. This allows a mobile app or third-party integrations to be added later without duplicating logic.

---

## 6. Out of Scope for MVP

- Data import from Excel (tackled after the web app is stable)
- Mobile app (web browser only for MVP)
- Bank feed integration (Plaid, Yodlee)
- Multi-user / team access
- Automated tenant notifications (lease renewal reminders, late payment alerts)
- Tenant-facing portal (rent payment, maintenance requests)
- Document storage (leases, receipts)
- QuickBooks / tax software integration
- Maintenance request tracking
- Partner capital contribution / distribution tracking

---

## 7. Proposed Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Database | Supabase (PostgreSQL) | Already provisioned; handles auth, real-time, row-level security for future multi-user |
| Backend | Supabase Edge Functions or Next.js API routes | Serverless, low ops overhead |
| Frontend | Next.js (React) | Strong ecosystem, easy to deploy, works well with Supabase |
| Hosting | Vercel | Zero-config deploys from GitHub |
| Auth | Supabase Auth | Built-in, extensible to multi-user with RLS later |

---

## 8. Future Phases (Backlog)

1. **Phase 2 — Team Access:** Individual logins for partners and bookkeeper, role-based permissions
2. **Phase 3 — Data Import:** Migrate historical Excel data
3. **Phase 4 — Bank Feeds:** Connect accounts via Plaid for automatic transaction import
4. **Phase 5 — Tenant Portal:** Tenant-facing rent payment and maintenance request portal
5. **Phase 6 — Documents:** Attach lease PDFs, receipts to records
6. **Phase 7 — Mobile:** Responsive PWA or native app for on-the-go cash payment logging
