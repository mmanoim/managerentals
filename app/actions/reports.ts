'use server'

import { createClient } from '@/lib/supabase/server'

export interface InquiryTx {
  id: string
  date: string
  description: string
  payee: string | null
  amount: number
}

export interface InquiryAccount {
  id: string
  name: string
  transactions: InquiryTx[]
  total: number
}

export async function getCategoryInquiry(
  dateFrom: string,
  dateTo: string,
  categoryId: string,
  accountId: string | null,
): Promise<{ accounts: InquiryAccount[]; net: number } | { error: string }> {
  if (!dateFrom || !dateTo) return { error: 'Date range required' }
  if (!categoryId) return { error: 'Select a category' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  let query = supabase
    .from('account_transactions')
    .select('id, date, description, payee, amount, account_id, account:accounts(id, name)')
    .eq('category_id', categoryId)
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date')
    .order('created_at')

  if (accountId) query = query.eq('account_id', accountId)

  const { data: txs, error } = await query
  if (error) return { error: error.message }

  const accountMap = new Map<string, InquiryAccount>()
  for (const tx of txs ?? []) {
    const acct = tx.account as { id: string; name: string } | null
    if (!acct) continue
    if (!accountMap.has(acct.id)) {
      accountMap.set(acct.id, { id: acct.id, name: acct.name, transactions: [], total: 0 })
    }
    const group = accountMap.get(acct.id)!
    group.transactions.push({ id: tx.id, date: tx.date, description: tx.description, payee: tx.payee, amount: Number(tx.amount) })
    group.total += Number(tx.amount)
  }

  const accounts = Array.from(accountMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  return { accounts, net: accounts.reduce((s, a) => s + a.total, 0) }
}

// ── P&L structured data ───────────────────────────────────────────────────────

export interface PLData {
  accounts: { id: string; name: string }[]
  incomeLines: { category: string; amount: number }[]
  totalIncome: number
  expenseLines: { category: string; byAccount: Record<string, number>; total: number }[]
  expenseTotalByAccount: Record<string, number>
  totalExpenses: number
  netIncome: number
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function buildPLData(
  supabase: SupabaseClient,
  dateFrom: string,
  dateTo: string,
  accountIds: string[],
): Promise<PLData | { error: string }> {
  const [{ data: accounts }, { data: txs }] = await Promise.all([
    supabase.from('accounts').select('id, name').in('id', accountIds).order('name'),
    supabase
      .from('account_transactions')
      .select('amount, account_id, category:chart_of_accounts(name, type)')
      .in('account_id', accountIds)
      .gte('date', dateFrom)
      .lte('date', dateTo),
  ])
  if (!txs) return { error: 'Failed to fetch transactions' }

  const accountList = accounts ?? []
  const incomeByCategory: Record<string, number> = {}
  const expenseByAccountCategory: Record<string, Record<string, number>> = {}

  for (const tx of txs) {
    const cat = tx.category as { name: string; type: string } | null
    if (!cat) continue
    const amount = Number(tx.amount)
    if (cat.type === 'income') {
      incomeByCategory[cat.name] = (incomeByCategory[cat.name] ?? 0) + amount
    } else if (cat.type === 'expense') {
      if (!expenseByAccountCategory[tx.account_id]) expenseByAccountCategory[tx.account_id] = {}
      expenseByAccountCategory[tx.account_id][cat.name] =
        (expenseByAccountCategory[tx.account_id][cat.name] ?? 0) + (-amount)
    }
  }

  const incomeLines = Object.entries(incomeByCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, amount]) => ({ category, amount }))
  const totalIncome = incomeLines.reduce((s, l) => s + l.amount, 0)

  const allExpenseCats = new Set<string>()
  for (const byCat of Object.values(expenseByAccountCategory))
    for (const cat of Object.keys(byCat)) allExpenseCats.add(cat)

  const expenseTotalByAccount: Record<string, number> = {}
  const expenseLines = Array.from(allExpenseCats).sort().map(category => {
    let total = 0
    const byAccount: Record<string, number> = {}
    for (const acct of accountList) {
      const amt = expenseByAccountCategory[acct.id]?.[category] ?? 0
      if (amt !== 0) byAccount[acct.id] = amt
      total += amt
      expenseTotalByAccount[acct.id] = (expenseTotalByAccount[acct.id] ?? 0) + amt
    }
    return { category, byAccount, total }
  })
  const totalExpenses = expenseLines.reduce((s, l) => s + l.total, 0)

  return {
    accounts: accountList,
    incomeLines,
    totalIncome,
    expenseLines,
    expenseTotalByAccount,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
  }
}

export async function getPLData(
  dateFrom: string,
  dateTo: string,
  accountIds: string[],
): Promise<PLData | { error: string }> {
  if (!dateFrom || !dateTo) return { error: 'Date range required' }
  if (accountIds.length === 0) return { error: 'Select at least one account' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  return buildPLData(supabase, dateFrom, dateTo, accountIds)
}

// ── Trial Balance ─────────────────────────────────────────────────────────────

export interface TBAccount {
  id: string
  name: string
  beginBalance: number
  endBalance: number
}

export interface TrialBalanceData {
  dateFrom: string
  dateTo: string
  bankAccounts: TBAccount[]
  payAppAccounts: TBAccount[]
  cashAccounts: TBAccount[]
  totalCurrentAssets: { begin: number; end: number }
  creditCardAccounts: TBAccount[]
  liabilityAccounts: TBAccount[]
  totalLiabilities: { begin: number; end: number }
  partnerAccounts: TBAccount[]
  netIncome: { begin: number; end: number }
  totalEquity: { begin: number; end: number }
  totalAssets: { begin: number; end: number }
  totalLiabilitiesAndEquity: { begin: number; end: number }
  difference: { begin: number; end: number }
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export async function getTrialBalanceData(
  dateFrom: string,
  dateTo: string,
  selectedAccountIds: string[],
): Promise<TrialBalanceData | { error: string }> {
  if (!dateFrom || !dateTo) return { error: 'Date range required' }
  if (selectedAccountIds.length === 0) return { error: 'Select at least one account' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const beginDate = prevDay(dateFrom)

  const [{ data: allAccounts }, beginBalances, endBalances, beginNIRes, endNIRes] = await Promise.all([
    supabase.from('accounts').select('id, name, type, opening_balance').order('name'),
    supabase.rpc('get_account_balances_as_of', { p_date: beginDate }),
    supabase.rpc('get_account_balances_as_of', { p_date: dateTo }),
    supabase.rpc('get_net_income_as_of', { p_date: beginDate }),
    supabase.rpc('get_net_income_as_of', { p_date: dateTo }),
  ])

  if (!allAccounts) return { error: 'Failed to fetch accounts' }
  if (beginBalances.error) return { error: beginBalances.error.message }
  if (endBalances.error) return { error: endBalances.error.message }

  const beginMap = new Map<string, number>(
    (beginBalances.data ?? []).map(b => [b.account_id, Number(b.balance)]),
  )
  const endMap = new Map<string, number>(
    (endBalances.data ?? []).map(b => [b.account_id, Number(b.balance)]),
  )
  const beginNI = Number(beginNIRes.data ?? 0)
  const endNI = Number(endNIRes.data ?? 0)

  function toTB(acct: { id: string; name: string; opening_balance: number }): TBAccount {
    return {
      id: acct.id,
      name: acct.name,
      beginBalance: beginMap.get(acct.id) ?? Number(acct.opening_balance),
      endBalance: endMap.get(acct.id) ?? Number(acct.opening_balance),
    }
  }

  const selectedSet = new Set(selectedAccountIds)
  // EXPORT_TYPES accounts are filtered by selection; partner/liability always included
  const byType = (type: string, applyFilter = false) =>
    allAccounts.filter(a => a.type === type && (!applyFilter || selectedSet.has(a.id))).map(toTB)
  const sumB = (accts: TBAccount[]) => accts.reduce((s, a) => s + a.beginBalance, 0)
  const sumE = (accts: TBAccount[]) => accts.reduce((s, a) => s + a.endBalance, 0)

  const bankAccounts   = byType('bank',   true)
  const payAppAccounts = byType('payapp', true)
  const cashAccounts   = byType('cash',   true)
  // Credit card balances are negative in our system (debt owed); shown as positive in liabilities
  const creditCardAccounts = byType('credit', true).map(a => ({
    ...a, beginBalance: -a.beginBalance, endBalance: -a.endBalance,
  }))
  const liabilityAccounts = byType('liability')
  const partnerAccounts   = byType('partner')

  const totalCurrentAssets = {
    begin: sumB(bankAccounts) + sumB(payAppAccounts) + sumB(cashAccounts),
    end:   sumE(bankAccounts) + sumE(payAppAccounts) + sumE(cashAccounts),
  }
  const totalLiabilities = {
    begin: sumB(creditCardAccounts) + sumB(liabilityAccounts),
    end:   sumE(creditCardAccounts) + sumE(liabilityAccounts),
  }
  const totalEquity = {
    begin: sumB(partnerAccounts) + beginNI,
    end:   sumE(partnerAccounts) + endNI,
  }
  const totalLiabilitiesAndEquity = {
    begin: totalLiabilities.begin + totalEquity.begin,
    end:   totalLiabilities.end   + totalEquity.end,
  }

  return {
    dateFrom,
    dateTo,
    bankAccounts,
    payAppAccounts,
    cashAccounts,
    totalCurrentAssets,
    creditCardAccounts,
    liabilityAccounts,
    totalLiabilities,
    partnerAccounts,
    netIncome: { begin: beginNI, end: endNI },
    totalEquity,
    totalAssets: totalCurrentAssets,
    totalLiabilitiesAndEquity,
    difference: {
      begin: totalCurrentAssets.begin - totalLiabilitiesAndEquity.begin,
      end:   totalCurrentAssets.end   - totalLiabilitiesAndEquity.end,
    },
  }
}

export async function generateTrialBalanceReport(
  dateFrom: string,
  dateTo: string,
  selectedAccountIds: string[],
): Promise<{ csv: string; filename: string } | { error: string }> {
  const data = await getTrialBalanceData(dateFrom, dateTo, selectedAccountIds)
  if ('error' in data) return data

  const {
    bankAccounts, payAppAccounts, cashAccounts,
    totalCurrentAssets, creditCardAccounts, liabilityAccounts,
    totalLiabilities, partnerAccounts, netIncome, totalEquity,
    totalAssets, totalLiabilitiesAndEquity, difference,
  } = data

  const lines: string[] = []
  const row = (...cells: unknown[]) => lines.push(cells.map(escapeCSV).join(','))
  const amt = (n: number) => n.toFixed(2)

  row('Trial Balance')
  row('Period:', `${dateFrom} to ${dateTo}`)
  row('', 'Beginning', 'Ending')
  row('')
  row('ASSETS')
  row('Current Assets')

  const writeGroup = (label: string, accts: TBAccount[]) => {
    if (accts.length === 0) return
    row(label)
    for (const a of accts) row('', a.name, amt(a.beginBalance), amt(a.endBalance))
    row('', `Total ${label}`, amt(accts.reduce((s,a)=>s+a.beginBalance,0)), amt(accts.reduce((s,a)=>s+a.endBalance,0)))
  }

  writeGroup('Checking / Savings', bankAccounts)
  writeGroup('Payment Apps', payAppAccounts)
  writeGroup('Cash', cashAccounts)
  row('Total Current Assets', '', amt(totalCurrentAssets.begin), amt(totalCurrentAssets.end))
  row('Total Assets', '', amt(totalAssets.begin), amt(totalAssets.end))
  row('')
  row('LIABILITIES & EQUITY')
  row('Liabilities')
  writeGroup('Credit Cards', creditCardAccounts)
  writeGroup('Other Liabilities', liabilityAccounts)
  row('Total Liabilities', '', amt(totalLiabilities.begin), amt(totalLiabilities.end))
  row('Equity')
  writeGroup('Partner Accounts', partnerAccounts)
  row('Net Income', '', amt(netIncome.begin), amt(netIncome.end))
  row('Total Equity', '', amt(totalEquity.begin), amt(totalEquity.end))
  row('Total Liabilities & Equity', '', amt(totalLiabilitiesAndEquity.begin), amt(totalLiabilitiesAndEquity.end))
  row('')
  row('Difference (Assets − Liabilities & Equity)', '', amt(difference.begin), amt(difference.end))

  return { csv: lines.join('\n'), filename: `TrialBalance_${dateFrom}_to_${dateTo}.csv` }
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function csvRow(...cells: unknown[]): string {
  return cells.map(escapeCSV).join(',')
}

function fmtAmt(n: number): string {
  return n.toFixed(2)
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

export async function generatePLReport(
  dateFrom: string,
  dateTo: string,
  accountIds: string[],
): Promise<{ csv: string; filename: string } | { error: string }> {
  if (!dateFrom || !dateTo) return { error: 'Date range required' }
  if (accountIds.length === 0) return { error: 'Select at least one account' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const data = await buildPLData(supabase, dateFrom, dateTo, accountIds)
  if ('error' in data) return data

  const { accounts, incomeLines, totalIncome, expenseLines, expenseTotalByAccount, totalExpenses, netIncome } = data

  const lines: string[] = []
  lines.push(csvRow('P&L Statement'))
  lines.push(csvRow('Period:', `${dateFrom} to ${dateTo}`))
  lines.push('')
  lines.push(csvRow('INCOME'))
  lines.push(csvRow('Category', 'Amount'))
  for (const l of incomeLines) lines.push(csvRow(l.category, fmtAmt(l.amount)))
  lines.push(csvRow('Total Income', fmtAmt(totalIncome)))
  lines.push('')
  lines.push(csvRow('EXPENSES'))
  lines.push(csvRow('Category', ...accounts.map(a => a.name), 'Total'))
  for (const l of expenseLines) {
    const cells: unknown[] = [l.category]
    for (const acct of accounts) {
      const amt = l.byAccount[acct.id] ?? 0
      cells.push(amt > 0 ? fmtAmt(amt) : '')
    }
    cells.push(fmtAmt(l.total))
    lines.push(csvRow(...cells))
  }
  lines.push(csvRow('Total Expenses', ...accounts.map(a => fmtAmt(expenseTotalByAccount[a.id] ?? 0)), fmtAmt(totalExpenses)))
  lines.push('')
  lines.push(csvRow('Net Income', '', fmtAmt(netIncome)))

  return { csv: lines.join('\n'), filename: `PL_${dateFrom}_to_${dateTo}.csv` }
}

export async function generateTransactionsReport(
  dateFrom: string,
  dateTo: string,
  accountIds: string[],
): Promise<{ csv: string; filename: string } | { error: string }> {
  if (!dateFrom || !dateTo) return { error: 'Date range required' }
  if (accountIds.length === 0) return { error: 'Select at least one account' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, opening_balance')
    .in('id', accountIds)
    .order('name')

  // Starting balance per account = opening_balance + all txs before dateFrom
  const startingBalances: Record<string, number> = {}
  await Promise.all(
    (accounts ?? []).map(async acct => {
      const { data: preTxs } = await supabase
        .from('account_transactions')
        .select('amount')
        .eq('account_id', acct.id)
        .lt('date', dateFrom)
      const priorSum = (preTxs ?? []).reduce((s, t) => s + Number(t.amount), 0)
      startingBalances[acct.id] = Number(acct.opening_balance) + priorSum
    }),
  )

  const { data: txs } = await supabase
    .from('account_transactions')
    .select('*, category:chart_of_accounts(name, type), property:properties(address), account:accounts(id, name)')
    .in('account_id', accountIds)
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date')
    .order('created_at')

  if (!txs) return { error: 'Failed to fetch transactions' }

  const runningBalances: Record<string, number> = { ...startingBalances }

  const lines: string[] = []
  lines.push(csvRow('Date', 'Type', 'Property', 'Check#', 'Payee', 'Category', 'Description/Memo', 'Expense', 'Income', 'Balance', 'Account'))

  for (const tx of txs) {
    const cat = tx.category as { name: string; type: string } | null
    const prop = tx.property as { address: string } | null
    const acct = tx.account as { id: string; name: string } | null

    const amount = Number(tx.amount)
    runningBalances[tx.account_id] = (runningBalances[tx.account_id] ?? 0) + amount

    let txType = 'Other'
    if (cat?.type === 'income') txType = '1.Income'
    else if (cat?.type === 'expense') txType = '2.Expense'
    else if (cat?.type === 'transfer') txType = '8.Transfer'

    lines.push(csvRow(
      fmtDate(tx.date),
      txType,
      prop?.address ?? '',
      tx.check_number ?? '',
      tx.payee ?? '',
      cat?.name ?? 'Uncategorized',
      tx.description ?? '',
      amount < 0 ? fmtAmt(Math.abs(amount)) : '',
      amount >= 0 ? fmtAmt(amount) : '',
      fmtAmt(runningBalances[tx.account_id] ?? 0),
      acct?.name ?? '',
    ))
  }

  return {
    csv: lines.join('\n'),
    filename: `Transactions_${dateFrom}_to_${dateTo}.csv`,
  }
}
