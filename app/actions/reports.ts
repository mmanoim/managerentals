'use server'

import { createClient } from '@/lib/supabase/server'

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

  // Accumulate income and expense by category, broken out by account
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
      // Negate: expense txs are negative → positive net; refund txs are positive → negative (reduces expense)
      // Net treatment matches accountant: Utilities $7290 expense - $417 refund = $6873 net
      expenseByAccountCategory[tx.account_id][cat.name] =
        (expenseByAccountCategory[tx.account_id][cat.name] ?? 0) + (-amount)
    }
  }

  const allExpenseCategories = new Set<string>()
  for (const byCat of Object.values(expenseByAccountCategory)) {
    for (const cat of Object.keys(byCat)) allExpenseCategories.add(cat)
  }
  const sortedExpenseCategories = Array.from(allExpenseCategories).sort()

  const lines: string[] = []
  lines.push(csvRow('P&L Statement'))
  lines.push(csvRow('Period:', `${dateFrom} to ${dateTo}`))
  lines.push('')

  // --- Income ---
  lines.push(csvRow('INCOME'))
  lines.push(csvRow('Category', 'Amount'))
  let totalIncome = 0
  for (const [cat, amount] of Object.entries(incomeByCategory).sort()) {
    lines.push(csvRow(cat, fmtAmt(amount)))
    totalIncome += amount
  }
  lines.push(csvRow('Total Income', fmtAmt(totalIncome)))
  lines.push('')

  // --- Expenses ---
  lines.push(csvRow('EXPENSES'))
  lines.push(csvRow('Category', ...accountList.map(a => a.name), 'Total'))

  let totalExpense = 0
  const accountTotals: Record<string, number> = {}

  for (const cat of sortedExpenseCategories) {
    let catTotal = 0
    const cells: unknown[] = [cat]
    for (const acct of accountList) {
      const amt = expenseByAccountCategory[acct.id]?.[cat] ?? 0
      cells.push(amt > 0 ? fmtAmt(amt) : '')
      catTotal += amt
      accountTotals[acct.id] = (accountTotals[acct.id] ?? 0) + amt
    }
    cells.push(fmtAmt(catTotal))
    lines.push(csvRow(...cells))
    totalExpense += catTotal
  }

  lines.push(csvRow(
    'Total Expenses',
    ...accountList.map(a => fmtAmt(accountTotals[a.id] ?? 0)),
    fmtAmt(totalExpense),
  ))
  lines.push('')
  lines.push(csvRow('Net Income', '', fmtAmt(totalIncome - totalExpense)))

  return {
    csv: lines.join('\n'),
    filename: `PL_${dateFrom}_to_${dateTo}.csv`,
  }
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
