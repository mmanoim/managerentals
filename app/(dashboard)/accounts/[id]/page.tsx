import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import InlineRegisterTable from '@/components/InlineRegisterTable'

const TYPE_LABELS: Record<string, string> = {
  bank: 'Bank Account', payapp: 'Payment App', cash: 'Cash', credit: 'Credit Card', partner: 'Partner Account',
}
const OWNER_LABELS: Record<string, string> = {
  joint: 'Joint', marina: 'Marina', jacob: 'Jacob',
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}
function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return new Date(Number(y), Number(m) - 1, Number(day))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AccountRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ date_from?: string; date_to?: string; reconciled?: string; category_id?: string }>
}) {
  const { id } = await params
  const { date_from, date_to, reconciled, category_id } = await searchParams
  const supabase = await createClient()

  const [{ data: account }, { data: allTx }, { data: categories }] = await Promise.all([
    supabase.from('accounts').select('*').eq('id', id).single(),
    supabase
      .from('account_transactions')
      .select('*, category:chart_of_accounts(id, code, name)')
      .eq('account_id', id)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('chart_of_accounts')
      .select('id, code, name')
      .eq('archived', false)
      .order('code'),
  ])

  // For transactions with a transfer_pair_id, check if the other side is a partner account
  const pairIds = (allTx ?? []).map(t => t.transfer_pair_id).filter(Boolean) as string[]
  const partnerPairIds = new Set<string>()
  if (pairIds.length > 0) {
    const { data: linkedTx } = await supabase
      .from('account_transactions')
      .select('transfer_pair_id, accounts!account_id(type)')
      .in('transfer_pair_id', pairIds)
      .neq('account_id', id)
    for (const lt of linkedTx ?? []) {
      if ((lt.accounts as any)?.type === 'partner') {
        partnerPairIds.add(lt.transfer_pair_id!)
      }
    }
  }

  if (!account) notFound()

  // Compute running balance across the full history in date order
  let runningBalance = Number(account.opening_balance)
  const withBalance = (allTx ?? []).map(tx => {
    runningBalance += Number(tx.amount)
    return { ...tx, running_balance: runningBalance }
  })
  const currentBalance = runningBalance

  // Apply filters (balance values already reflect full history)
  let filtered = withBalance
  if (date_from)   filtered = filtered.filter(tx => tx.date >= date_from)
  if (date_to)     filtered = filtered.filter(tx => tx.date <= date_to)
  if (category_id === 'none') filtered = filtered.filter(tx => !tx.category_id)
  else if (category_id)      filtered = filtered.filter(tx => tx.category_id === category_id)
  if (reconciled === 'yes') filtered = filtered.filter(tx => tx.reconciled)
  if (reconciled === 'no')  filtered = filtered.filter(tx => !tx.reconciled)

  // Newest first for display
  const displayRows = [...filtered].reverse()

  const hasFilters = date_from || date_to || reconciled || category_id

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/accounts"
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Accounts
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{account.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {TYPE_LABELS[account.type]} · {OWNER_LABELS[account.owner]}
            {account.institution ? ` · ${account.institution}` : ''}
            {account.last_four ? ` ···· ${account.last_four}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Balance</p>
            <p className={`text-2xl font-bold tabular-nums mt-0.5 ${currentBalance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {fmtCurrency(currentBalance)}
            </p>
          </div>
          <Link
            href={`/accounts/${id}/import`}
            className="border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import CSV
          </Link>
          <Link
            href={`/accounts/${id}/transactions/new`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add transaction
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <form method="GET" action={`/accounts/${id}`}
        className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 mb-6 flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
          <input type="date" name="date_from" defaultValue={date_from}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
          <input type="date" name="date_to" defaultValue={date_to}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
          <select name="category_id" defaultValue={category_id ?? ''}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            <option value="">All categories</option>
            <option value="none">— Uncategorized —</option>
            {(categories ?? []).map(c => (
              <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
          <select name="reconciled" defaultValue={reconciled ?? ''}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            <option value="">All</option>
            <option value="yes">Reconciled</option>
            <option value="no">Unreconciled</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit"
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            Filter
          </button>
          {hasFilters && (
            <Link href={`/accounts/${id}`}
              className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors">
              Clear
            </Link>
          )}
        </div>
      </form>

      {/* Register table */}
      {displayRows.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          {hasFilters ? (
            <>
              <p className="text-slate-600 font-medium">No transactions match these filters</p>
              <Link href={`/accounts/${id}`}
                className="mt-3 inline-block text-indigo-600 text-sm font-medium hover:underline">
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <p className="text-slate-600 font-medium">No transactions yet</p>
              <p className="text-slate-400 text-sm mt-1">
                Add transactions manually or import a bank CSV statement
              </p>
              <Link href={`/accounts/${id}/transactions/new`}
                className="mt-4 inline-block text-indigo-600 text-sm font-medium hover:underline">
                Add a transaction →
              </Link>
            </>
          )}
        </div>
      ) : (
        <InlineRegisterTable
          accountId={id}
          rows={displayRows.map((tx: any) => ({
            id: tx.id,
            date: tx.date,
            description: tx.description,
            payee: tx.payee ?? null,
            check_number: tx.check_number ?? null,
            notes: tx.notes ?? null,
            amount: Number(tx.amount),
            running_balance: tx.running_balance,
            reconciled: tx.reconciled,
            source: tx.source,
            transfer_pair_id: tx.transfer_pair_id ?? null,
            category_id: (tx.category as any)?.id ?? null,
          }))}
          categories={categories ?? []}
          partnerPairIds={partnerPairIds}
          totalCount={withBalance.length}
          hasFilters={!!hasFilters}
          openingBalance={Number(account.opening_balance)}
        />
      )}
    </div>
  )
}
