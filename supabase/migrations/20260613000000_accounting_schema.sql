-- Phase 4A: Accounting Layer Schema
-- Tables: chart_of_accounts, accounts, account_transactions, reconciliations

-- ─────────────────────────────────────────────────────────────
-- 1. chart_of_accounts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE chart_of_accounts (
  id         uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  code       text NOT NULL UNIQUE,
  name       text NOT NULL,
  type       text NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'equity')),
  parent_id  uuid REFERENCES chart_of_accounts(id),
  archived   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON chart_of_accounts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 2. accounts  (bank accounts, payment apps, cash)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE accounts (
  id              uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name            text NOT NULL,
  type            text NOT NULL CHECK (type IN ('bank', 'payapp', 'cash', 'credit')),
  institution     text,
  last_four       text,
  owner           text NOT NULL DEFAULT 'joint' CHECK (owner IN ('joint', 'marina', 'jacob')),
  opening_balance numeric(12,2) NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON accounts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 3. account_transactions
-- ─────────────────────────────────────────────────────────────
CREATE TABLE account_transactions (
  id              uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  account_id      uuid NOT NULL REFERENCES accounts(id),
  date            date NOT NULL,
  description     text NOT NULL,
  amount          numeric(12,2) NOT NULL,  -- positive = money in, negative = money out
  category_id     uuid REFERENCES chart_of_accounts(id),
  property_id     uuid REFERENCES properties(id),
  notes           text,
  source          text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'csv', 'pdf')),
  import_batch_id text,
  reconciled      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX account_transactions_account_id_idx    ON account_transactions(account_id);
CREATE INDEX account_transactions_date_idx          ON account_transactions(date);
CREATE INDEX account_transactions_reconciled_idx    ON account_transactions(reconciled) WHERE reconciled = false;
CREATE INDEX account_transactions_import_batch_idx  ON account_transactions(import_batch_id) WHERE import_batch_id IS NOT NULL;

ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON account_transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 4. reconciliations
-- ─────────────────────────────────────────────────────────────
CREATE TABLE reconciliations (
  id                     uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  lease_ledger_entry_id  uuid REFERENCES lease_ledger_entries(id),
  account_transaction_id uuid REFERENCES account_transactions(id),
  status                 text NOT NULL DEFAULT 'matched' CHECK (status IN ('matched', 'partial', 'exception')),
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reconciliations_ledger_entry_idx      ON reconciliations(lease_ledger_entry_id);
CREATE INDEX reconciliations_account_tx_idx        ON reconciliations(account_transaction_id);

ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON reconciliations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- Seed: Chart of Accounts
-- ─────────────────────────────────────────────────────────────
INSERT INTO chart_of_accounts (code, name, type) VALUES
  -- Income: Rental (one account per unit/property)
  ('4010', 'Rental Income — 14 Cottage Unit 1', 'income'),
  ('4020', 'Rental Income — 14 Cottage Unit 2', 'income'),
  ('4030', 'Rental Income — 14 Cottage Unit 3', 'income'),
  ('4040', 'Rental Income — 19 Walters',         'income'),
  ('4050', 'Rental Income — 48 Briarwood',       'income'),
  ('4060', 'Rental Income — 9 Bray',             'income'),
  ('4070', 'Rental Income — [next property]',    'income'),
  ('4100', 'Late Fees',                          'income'),
  ('4200', 'Security Deposit Forfeited',         'income'),
  -- Expenses
  ('5010', 'Repairs & Maintenance',    'expense'),
  ('5020', 'Landscaping',              'expense'),
  ('5030', 'Utilities',                'expense'),
  ('5040', 'Insurance',                'expense'),
  ('5050', 'Property Management Fees', 'expense'),
  ('5060', 'Legal & Professional',     'expense'),
  ('5070', 'Advertising',              'expense'),
  ('5080', 'Office & Admin',           'expense'),
  ('5090', 'Travel',                   'expense'),
  ('5100', 'Mortgage Interest',        'expense'),
  ('5110', 'Property Taxes',           'expense'),
  ('5120', 'Depreciation',             'expense'),
  ('5130', 'HOA Fees',                 'expense'),
  ('5140', 'Cleaning',                 'expense'),
  ('5150', 'Capital Improvements',     'expense'),
  -- Transfers (inter-account; not P&L)
  ('6010', 'Transfer — Cash App to Joint',  'transfer'),
  ('6020', 'Transfer — Venmo to Joint',     'transfer'),
  ('6030', 'Transfer — Personal to Joint',  'transfer'),
  ('6040', 'Transfer — Joint to Personal',  'transfer');

-- ─────────────────────────────────────────────────────────────
-- Seed: Accounts (known real-world accounts)
-- ─────────────────────────────────────────────────────────────
INSERT INTO accounts (name, type, institution, owner) VALUES
  ('TD Bank Joint Checking', 'bank',   'TD Bank',  'joint'),
  ('Marina — Personal Checking', 'bank', NULL,     'marina'),
  ('Jacob — Personal Checking',  'bank', NULL,     'jacob'),
  ('Cash App — Marina', 'payapp', 'Cash App', 'marina'),
  ('Cash App — Jacob',  'payapp', 'Cash App', 'jacob'),
  ('Venmo — Marina',    'payapp', 'Venmo',    'marina'),
  ('Zelle',             'payapp', 'Zelle',    'joint'),
  ('Cash on Hand',      'cash',   NULL,       'joint');
