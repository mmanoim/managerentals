'use client'

import { useState } from 'react'
import { generatePLReport, generateTransactionsReport } from '@/app/actions/reports'

interface Account { id: string; name: string; type: string }

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ReportsForm({ accounts }: { accounts: Account[] }) {
  const currentYear = new Date().getFullYear()
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`)
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`)
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(
    new Set(accounts.map(a => a.id))
  )
  const [loading, setLoading] = useState<'pl' | 'transactions' | null>(null)
  const [error, setError] = useState<string | null>(null)

  function toggleAccount(id: string) {
    setSelectedAccounts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function setYear(year: number) {
    setDateFrom(`${year}-01-01`)
    setDateTo(`${year}-12-31`)
  }

  const isFullYear = (year: number) =>
    dateFrom === `${year}-01-01` && dateTo === `${year}-12-31`

  async function handleDownload(type: 'pl' | 'transactions') {
    setLoading(type)
    setError(null)
    const ids = Array.from(selectedAccounts)
    const result = type === 'pl'
      ? await generatePLReport(dateFrom, dateTo, ids)
      : await generateTransactionsReport(dateFrom, dateTo, ids)
    if ('error' in result) {
      setError(result.error)
    } else {
      downloadCsv(result.csv, result.filename)
    }
    setLoading(null)
  }

  const TYPE_LABELS: Record<string, string> = { bank: 'Bank', credit: 'Credit Card', payapp: 'Payment App', cash: 'Cash' }
  const canDownload = loading === null && selectedAccounts.size > 0

  return (
    <div className="space-y-6">
      {/* Date range */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Date Range</h2>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {[2023, 2024, 2025].map(y => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isFullYear(y)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Account selection */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Accounts to Include</h2>
        <div className="space-y-3">
          {accounts.map(acct => (
            <label key={acct.id} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedAccounts.has(acct.id)}
                onChange={() => toggleAccount(acct.id)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-800 font-medium group-hover:text-slate-900">{acct.name}</span>
              <span className="text-xs text-slate-400">{TYPE_LABELS[acct.type] ?? acct.type}</span>
            </label>
          ))}
        </div>
        {selectedAccounts.size === 0 && (
          <p className="text-xs text-amber-600 mt-3">Select at least one account</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Downloads */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Download</h2>
        <p className="text-xs text-slate-400 mb-5">Files open in Excel. P&L shows income and expenses by category; Transactions lists every entry.</p>
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => handleDownload('pl')}
            disabled={!canDownload}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-5 rounded-lg transition-colors text-sm"
          >
            {loading === 'pl' ? (
              <span>Generating…</span>
            ) : (
              <><DownloadIcon /> P&L Statement</>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleDownload('transactions')}
            disabled={!canDownload}
            className="flex items-center gap-2 border border-slate-300 hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-semibold py-2.5 px-5 rounded-lg transition-colors text-sm"
          >
            {loading === 'transactions' ? (
              <span>Generating…</span>
            ) : (
              <><DownloadIcon /> Transactions</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
