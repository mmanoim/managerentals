'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Tx {
  id: string
  date: string
  description: string
  amount: number
  source: string
}

interface Props {
  accountId: string
  openingBalance: number
  clearedBalance: number    // opening + all already-reconciled
  transactions: Tx[]        // unreconciled only
  finalizeAction: (txIds: string[]) => Promise<{ success: true } | { error: string }>
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return new Date(Number(y), Number(m) - 1, Number(day))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ReconcileSession({
  accountId,
  openingBalance,
  clearedBalance,
  transactions,
  finalizeAction,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [statementBalance, setStatementBalance] = useState('')
  const [statementDate, setStatementDate] = useState('')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const stmtAmt = parseFloat(statementBalance) || 0

  const checkedSum = useMemo(
    () => transactions.filter(t => checked.has(t.id)).reduce((s, t) => s + t.amount, 0),
    [checked, transactions],
  )

  const currentCleared = clearedBalance + checkedSum
  const difference = stmtAmt - currentCleared
  const differenceZero = statementBalance !== '' && Math.abs(difference) < 0.005
  const canFinalize = differenceZero && checked.size > 0

  const allChecked = transactions.length > 0 && checked.size === transactions.length

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allChecked) {
      setChecked(new Set())
    } else {
      setChecked(new Set(transactions.map(t => t.id)))
    }
  }

  function handleFinalize() {
    setError(null)
    startTransition(async () => {
      const result = await finalizeAction(Array.from(checked))
      if ('error' in result) {
        setError(result.error)
      } else {
        setDone(true)
        router.refresh()
      }
    })
  }

  if (done) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 mb-4">
          <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Reconciliation complete</h2>
        <p className="text-slate-500 text-sm mb-6">
          {checked.size} transaction{checked.size !== 1 ? 's' : ''} marked as reconciled.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => { setDone(false); setChecked(new Set()); setStatementBalance(''); setStatementDate('') }}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Reconcile another period
          </button>
          <button
            onClick={() => router.push('/reconciliation')}
            className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors"
          >
            Back to accounts
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      {/* Transaction list */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {transactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 mb-3">
              <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold">All transactions reconciled</p>
            <p className="text-slate-400 text-sm mt-1">Nothing left to check off.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-2 py-3 whitespace-nowrap">Date</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-2 py-3">Description</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Amount</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(() => {
                let running = clearedBalance
                return transactions.map(tx => {
                  running += tx.amount
                  const balance = running
                  const isChecked = checked.has(tx.id)
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => toggle(tx.id)}
                      className={`cursor-pointer transition-colors ${isChecked ? 'bg-indigo-50 hover:bg-indigo-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(tx.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-2 py-3 text-slate-500 whitespace-nowrap tabular-nums">
                        {fmtDate(tx.date)}
                      </td>
                      <td className="px-2 py-3 max-w-xs">
                        <p className={`truncate ${isChecked ? 'text-indigo-900 font-medium' : 'text-slate-700'}`}>
                          {tx.description}
                        </p>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {tx.amount >= 0 ? '+' : ''}{fmtCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap text-slate-600 text-xs">
                        {fmtCurrency(balance)}
                      </td>
                    </tr>
                  )
                })
              })()}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-100 bg-slate-50">
                <td colSpan={5} className="px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                  <span>{checked.size} of {transactions.length} selected</span>
                  {checked.size > 0 && (
                    <span className="text-slate-400">
                      · sum: <span className={`font-medium ${checkedSum >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {checkedSum >= 0 ? '+' : ''}{fmtCurrency(checkedSum)}
                      </span>
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Sticky summary panel */}
      <div className="lg:sticky lg:top-24 space-y-4">
        {/* Statement info */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 text-sm">Statement details</h2>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Statement ending date</label>
            <input
              type="date"
              value={statementDate}
              onChange={e => setStatementDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Statement ending balance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={statementBalance}
                onChange={e => setStatementBalance(e.target.value)}
                className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Running totals */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-slate-900 text-sm">Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center text-slate-600">
              <span>Statement balance</span>
              <span className="font-medium tabular-nums text-slate-900">
                {statementBalance !== '' ? fmtCurrency(stmtAmt) : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Cleared balance</span>
              <span className="font-medium tabular-nums text-slate-900">{fmtCurrency(currentCleared)}</span>
            </div>
            <div className="border-t border-slate-100 pt-2 flex justify-between items-center font-semibold">
              <span className={differenceZero ? 'text-emerald-600' : 'text-slate-900'}>Difference</span>
              <span className={`tabular-nums ${differenceZero ? 'text-emerald-600' : statementBalance !== '' ? 'text-amber-600' : 'text-slate-400'}`}>
                {statementBalance !== '' ? fmtCurrency(difference) : '—'}
              </span>
            </div>
          </div>

          {differenceZero && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Balanced — ready to finalize
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
        )}

        <button
          onClick={handleFinalize}
          disabled={!canFinalize || isPending || transactions.length === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors"
        >
          {isPending ? 'Saving…' : `Complete reconciliation (${checked.size})`}
        </button>
        <p className="text-xs text-slate-400 text-center">
          {canFinalize
            ? `${checked.size} transaction${checked.size !== 1 ? 's' : ''} will be marked reconciled`
            : 'Check off transactions until the difference is $0.00'}
        </p>
      </div>
    </div>
  )
}
