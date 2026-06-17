'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { patchTransactionCategory, deleteTransaction } from '@/app/actions/account_transactions'

const SOURCE_LABELS: Record<string, string> = {
  csv: 'CSV', pdf: 'PDF', tenant_payment: 'Tenant',
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}
function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return new Date(Number(y), Number(m) - 1, Number(day))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Category { id: string; code: string; name: string }
interface Tx {
  id: string
  date: string
  description: string
  payee: string | null
  check_number: string | null
  notes: string | null
  amount: number
  running_balance: number
  reconciled: boolean
  source: string
  transfer_pair_id: string | null
  category_id: string | null
}

interface Props {
  accountId: string
  rows: Tx[]
  categories: Category[]
  partnerPairIds: Set<string>
  totalCount: number
  hasFilters: boolean
  openingBalance: number
}

export default function InlineRegisterTable({
  accountId, rows, categories, partnerPairIds, totalCount, hasFilters, openingBalance,
}: Props) {
  const [categoryMap, setCategoryMap] = useState<Record<string, string | null>>(() => {
    const m: Record<string, string | null> = {}
    for (const tx of rows) m[tx.id] = tx.category_id
    return m
  })
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds]   = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  function handleCategoryChange(txId: string, value: string) {
    const newCatId = value || null
    setCategoryMap(prev => ({ ...prev, [txId]: newCatId }))
    setSavingIds(prev => new Set(prev).add(txId))
    setSavedIds(prev => { const s = new Set(prev); s.delete(txId); return s })

    startTransition(async () => {
      await patchTransactionCategory(txId, accountId, newCatId)
      setSavingIds(prev => { const s = new Set(prev); s.delete(txId); return s })
      setSavedIds(prev => new Set(prev).add(txId))
      setTimeout(() => setSavedIds(prev => { const s = new Set(prev); s.delete(txId); return s }), 1500)
    })
  }

  async function handleDelete(txId: string) {
    if (!confirm('Delete this transaction?')) return
    await deleteTransaction(accountId, txId)
  }

  const sel = 'text-xs border border-transparent hover:border-slate-300 focus:border-indigo-400 rounded px-1.5 py-1 bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 text-slate-600 w-full cursor-pointer'

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3 whitespace-nowrap">Date</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Description</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Category</th>
            <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Amount</th>
            <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Balance</th>
            <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-3 py-3">✓</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((tx) => {
            const saving = savingIds.has(tx.id)
            const saved  = savedIds.has(tx.id)
            return (
              <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-slate-500 whitespace-nowrap tabular-nums">
                  {fmtDate(tx.date)}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-slate-900 font-medium truncate">{tx.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {tx.payee && <p className="text-xs text-slate-600 truncate font-medium">{tx.payee}</p>}
                    {tx.check_number && <p className="text-xs text-slate-400 truncate">#{tx.check_number}</p>}
                    {tx.notes && !tx.payee && <p className="text-xs text-slate-400 truncate">{tx.notes}</p>}
                    {tx.transfer_pair_id && partnerPairIds.has(tx.transfer_pair_id) && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex-shrink-0">Partner Payment</span>
                    )}
                    {tx.transfer_pair_id && !partnerPairIds.has(tx.transfer_pair_id) && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 flex-shrink-0">⇄ Transfer</span>
                    )}
                    {!tx.transfer_pair_id && tx.source !== 'manual' && SOURCE_LABELS[tx.source] && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 flex-shrink-0">{SOURCE_LABELS[tx.source]}</span>
                    )}
                  </div>
                </td>

                {/* Inline category dropdown */}
                <td className="px-4 py-2.5 min-w-[180px]">
                  <div className="flex items-center gap-1.5">
                    <select
                      value={categoryMap[tx.id] ?? ''}
                      onChange={e => handleCategoryChange(tx.id, e.target.value)}
                      className={sel}
                    >
                      <option value="">— uncategorized —</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
                      ))}
                    </select>
                    {saving && (
                      <svg className="w-3.5 h-3.5 text-slate-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    )}
                    {saved && !saving && (
                      <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </td>

                <td className={`px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap ${Number(tx.amount) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {Number(tx.amount) >= 0 ? '+' : ''}{fmtCurrency(Number(tx.amount))}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-700 whitespace-nowrap">
                  {fmtCurrency(tx.running_balance)}
                </td>
                <td className="px-3 py-3 text-center">
                  {tx.reconciled
                    ? <span title="Reconciled" className="inline-flex text-emerald-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    : <span title="Unreconciled" className="inline-flex text-slate-200">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="4" />
                        </svg>
                      </span>
                  }
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/accounts/${accountId}/transactions/${tx.id}/edit`}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium"
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
        <span>
          {rows.length} transaction{rows.length !== 1 ? 's' : ''}
          {hasFilters ? ` of ${totalCount} total` : ''}
        </span>
        <span>
          Opening balance: <span className="font-medium text-slate-700">{fmtCurrency(openingBalance)}</span>
        </span>
      </div>
    </div>
  )
}
