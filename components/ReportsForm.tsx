'use client'

import { useState } from 'react'
import { generatePLReport, generateTransactionsReport, generateTrialBalanceReport, getCategoryInquiry, getPLData, getTrialBalanceData, type InquiryAccount, type PLData, type TrialBalanceData } from '@/app/actions/reports'

interface Account  { id: string; name: string; type: string }
interface Category { id: string; code: string; name: string }

interface InquiryResult { accounts: InquiryAccount[]; net: number }

const TYPE_LABELS: Record<string, string> = {
  bank: 'Bank', credit: 'Credit Card', payapp: 'Payment App', cash: 'Cash', partner: 'Partner',
}

// Accounts shown in the P&L / Transactions exports
const EXPORT_TYPES = ['bank', 'credit', 'payapp', 'cash']

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return new Date(Number(y), Number(m) - 1, Number(day))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function DateRangePicker({
  from, to, onFrom, onTo,
}: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear]
  const isFullYear = (y: number) => from === `${y}-01-01` && to === `${y}-12-31`
  const inputCls = 'px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {years.map(y => (
          <button key={y} type="button" onClick={() => { onFrom(`${y}-01-01`); onTo(`${y}-12-31`) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isFullYear(y) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>{y}</button>
        ))}
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
          <input type="date" value={from} onChange={e => onFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
          <input type="date" value={to} onChange={e => onTo(e.target.value)} className={inputCls} />
        </div>
      </div>
    </div>
  )
}

export default function ReportsForm({ accounts, categories }: { accounts: Account[]; categories: Category[] }) {
  const currentYear = new Date().getFullYear()
  const [tab, setTab] = useState<'exports' | 'inquiry'>('exports')

  // ── Exports state ──────────────────────────────────────────
  const exportAccounts = accounts.filter(a => EXPORT_TYPES.includes(a.type))
  const [dateFrom, setDateFrom]         = useState(`${currentYear}-01-01`)
  const [dateTo, setDateTo]             = useState(`${currentYear}-12-31`)
  const [selectedAccounts, setSelected] = useState<Set<string>>(new Set(exportAccounts.map(a => a.id)))
  const [dlLoading, setDlLoading]       = useState<'pl' | 'transactions' | 'tb' | null>(null)
  const [exportError, setExportError]   = useState<string | null>(null)
  const [plData, setPlData]             = useState<PLData | null>(null)
  const [plLoading, setPlLoading]       = useState(false)
  const [tbData, setTbData]             = useState<TrialBalanceData | null>(null)
  const [tbLoading, setTbLoading]       = useState(false)

  // ── Inquiry state ───────────────────────────────────────────
  const [inqFrom, setInqFrom]           = useState(`${currentYear}-01-01`)
  const [inqTo, setInqTo]               = useState(`${currentYear}-12-31`)
  const [inqCategoryId, setInqCat]      = useState('')
  const [inqAccountId, setInqAccount]   = useState('')
  const [inqResult, setInqResult]       = useState<InquiryResult | null>(null)
  const [inqLoading, setInqLoading]     = useState(false)
  const [inqError, setInqError]         = useState<string | null>(null)

  function toggleAccount(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  async function handleViewPL() {
    setPlLoading(true); setExportError(null); setPlData(null)
    const result = await getPLData(dateFrom, dateTo, Array.from(selectedAccounts))
    if ('error' in result) setExportError(result.error)
    else setPlData(result)
    setPlLoading(false)
  }

  async function handleViewTB() {
    setTbLoading(true); setExportError(null); setTbData(null)
    const result = await getTrialBalanceData(dateFrom, dateTo, Array.from(selectedAccounts))
    if ('error' in result) setExportError(result.error)
    else setTbData(result)
    setTbLoading(false)
  }

  async function handleDownload(type: 'pl' | 'transactions' | 'tb') {
    setDlLoading(type); setExportError(null)
    const result = type === 'pl'
      ? await generatePLReport(dateFrom, dateTo, Array.from(selectedAccounts))
      : type === 'tb'
        ? await generateTrialBalanceReport(dateFrom, dateTo, Array.from(selectedAccounts))
        : await generateTransactionsReport(dateFrom, dateTo, Array.from(selectedAccounts))
    if ('error' in result) setExportError(result.error)
    else downloadCsv(result.csv, result.filename)
    setDlLoading(null)
  }

  async function handleInquiry() {
    setInqLoading(true); setInqError(null); setInqResult(null)
    const result = await getCategoryInquiry(inqFrom, inqTo, inqCategoryId, inqAccountId || null)
    if ('error' in result) setInqError(result.error)
    else setInqResult(result)
    setInqLoading(false)
  }

  const tabBtn = (active: boolean) =>
    `flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
      active ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
    }`

  const selectCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl">
        <button onClick={() => setTab('exports')}  className={tabBtn(tab === 'exports')}>Exports</button>
        <button onClick={() => setTab('inquiry')} className={tabBtn(tab === 'inquiry')}>Category Inquiry</button>
      </div>

      {/* ── EXPORTS TAB ─────────────────────────────────────── */}
      {tab === 'exports' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Date Range</h2>
            <DateRangePicker from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Accounts to Include</h2>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedAccounts.size === exportAccounts.length}
                  ref={el => { if (el) el.indeterminate = selectedAccounts.size > 0 && selectedAccounts.size < exportAccounts.length }}
                  onChange={() => {
                    if (selectedAccounts.size === exportAccounts.length)
                      setSelected(new Set())
                    else
                      setSelected(new Set(exportAccounts.map(a => a.id)))
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500">All</span>
              </label>
            </div>
            <div className="space-y-3">
              {exportAccounts.map(acct => (
                <label key={acct.id} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={selectedAccounts.has(acct.id)} onChange={() => toggleAccount(acct.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-slate-800 font-medium group-hover:text-slate-900">{acct.name}</span>
                  <span className="text-xs text-slate-400">{TYPE_LABELS[acct.type] ?? acct.type}</span>
                </label>
              ))}
            </div>
            {selectedAccounts.size === 0 && (
              <p className="text-xs text-amber-600 mt-3">Select at least one account</p>
            )}
          </div>

          {exportError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{exportError}</div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Generate</h2>
            <p className="text-xs text-slate-400 mb-5">View reports on screen or download as CSV that opens in Excel.</p>

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">P&amp;L / Transactions</p>
            <div className="flex gap-3 flex-wrap mb-5">
              <button type="button" onClick={handleViewPL}
                disabled={plLoading || tbLoading || dlLoading !== null || selectedAccounts.size === 0}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-5 rounded-lg transition-colors text-sm">
                {plLoading ? 'Loading…' : 'View P&L'}
              </button>
              <button type="button" onClick={() => handleDownload('pl')}
                disabled={plLoading || tbLoading || dlLoading !== null || selectedAccounts.size === 0}
                className="flex items-center gap-2 border border-slate-300 hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-semibold py-2.5 px-5 rounded-lg transition-colors text-sm">
                {dlLoading === 'pl' ? <span>Generating…</span> : <><DownloadIcon /> P&amp;L CSV</>}
              </button>
              <button type="button" onClick={() => handleDownload('transactions')}
                disabled={plLoading || tbLoading || dlLoading !== null || selectedAccounts.size === 0}
                className="flex items-center gap-2 border border-slate-300 hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-semibold py-2.5 px-5 rounded-lg transition-colors text-sm">
                {dlLoading === 'transactions' ? <span>Generating…</span> : <><DownloadIcon /> Transactions CSV</>}
              </button>
            </div>

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Trial Balance</p>
            <p className="text-xs text-slate-400 mb-3">Balance sheet view of selected accounts — assets, liabilities, and equity — as of the selected period. Partner and liability accounts always included.</p>
            <div className="flex gap-3 flex-wrap">
              <button type="button" onClick={handleViewTB}
                disabled={plLoading || tbLoading || dlLoading !== null || selectedAccounts.size === 0}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-5 rounded-lg transition-colors text-sm">
                {tbLoading ? 'Loading…' : 'View Trial Balance'}
              </button>
              <button type="button" onClick={() => handleDownload('tb')}
                disabled={plLoading || tbLoading || dlLoading !== null || selectedAccounts.size === 0}
                className="flex items-center gap-2 border border-slate-300 hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-semibold py-2.5 px-5 rounded-lg transition-colors text-sm">
                {dlLoading === 'tb' ? <span>Generating…</span> : <><DownloadIcon /> Trial Balance CSV</>}
              </button>
            </div>
          </div>

          {/* On-screen Trial Balance */}
          {tbData && (() => {
            const tb = tbData
            const col = (n: number) => (
              <span className={`tabular-nums ${n < 0 ? 'text-red-600' : ''}`}>{usd(n)}</span>
            )
            type TBAcct = { id: string; name: string; beginBalance: number; endBalance: number }
            function TBGroup({ label, accounts }: { label: string; accounts: TBAcct[] }) {
              if (accounts.length === 0) return null
              const totB = accounts.reduce((s, a) => s + a.beginBalance, 0)
              const totE = accounts.reduce((s, a) => s + a.endBalance, 0)
              return (
                <>
                  <tr className="bg-slate-50">
                    <td colSpan={3} className="px-6 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</td>
                  </tr>
                  {accounts.map(a => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="px-6 py-2 pl-10 text-sm text-slate-700">{a.name}</td>
                      <td className="py-2 text-right text-sm px-4">{col(a.beginBalance)}</td>
                      <td className="py-2 text-right text-sm px-6">{col(a.endBalance)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 font-medium">
                    <td className="px-6 py-2 pl-10 text-sm text-slate-600">Total {label}</td>
                    <td className="py-2 text-right text-sm px-4">{col(totB)}</td>
                    <td className="py-2 text-right text-sm px-6">{col(totE)}</td>
                  </tr>
                </>
              )
            }
            function SectionRow({ label, begin, end, bold }: { label: string; begin: number; end: number; bold?: boolean }) {
              return (
                <tr className={`border-t-2 border-slate-300 ${bold ? 'font-bold' : 'font-semibold'}`}>
                  <td className="px-6 py-2.5 text-sm text-slate-800">{label}</td>
                  <td className="py-2.5 text-right text-sm px-4">{col(begin)}</td>
                  <td className="py-2.5 text-right text-sm px-6">{col(end)}</td>
                </tr>
              )
            }
            return (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Trial Balance</p>
                    <p className="text-xs text-slate-400 mt-0.5">{tb.dateFrom} – {tb.dateTo}</p>
                  </div>
                  <button type="button" onClick={() => handleDownload('tb')}
                    disabled={dlLoading !== null}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors">
                    <DownloadIcon /> Download CSV
                  </button>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Account</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Beginning</th>
                      <th className="text-right px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Ending</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-indigo-50">
                      <td colSpan={3} className="px-6 py-2 text-xs font-bold text-indigo-700 uppercase tracking-widest">Assets</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td colSpan={3} className="px-6 py-1 text-xs font-semibold text-slate-500">Current Assets</td>
                    </tr>
                    <TBGroup label="Checking / Savings" accounts={tb.bankAccounts} />
                    <TBGroup label="Payment Apps" accounts={tb.payAppAccounts} />
                    <TBGroup label="Cash" accounts={tb.cashAccounts} />
                    <SectionRow label="Total Current Assets" begin={tb.totalCurrentAssets.begin} end={tb.totalCurrentAssets.end} />
                    <SectionRow label="Total Assets" begin={tb.totalAssets.begin} end={tb.totalAssets.end} bold />

                    <tr className="bg-indigo-50">
                      <td colSpan={3} className="px-6 py-2 text-xs font-bold text-indigo-700 uppercase tracking-widest">Liabilities</td>
                    </tr>
                    <TBGroup label="Credit Cards" accounts={tb.creditCardAccounts} />
                    <TBGroup label="Other Liabilities" accounts={tb.liabilityAccounts} />
                    <SectionRow label="Total Liabilities" begin={tb.totalLiabilities.begin} end={tb.totalLiabilities.end} bold />
                  </tbody>
                </table>
              </div>
            )
          })()}

          {/* On-screen P&L */}
          {plData && (() => {
            const { accounts: accts, incomeLines, totalIncome, expenseLines, expenseTotalByAccount, totalExpenses, netIncome } = plData
            const multiAccount = accts.length > 1
            const net = netIncome
            return (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div>
                    <p className="text-sm font-bold text-slate-800">P&amp;L Statement</p>
                    <p className="text-xs text-slate-400 mt-0.5">{dateFrom} – {dateTo}</p>
                  </div>
                  <button type="button" onClick={() => handleDownload('pl')}
                    disabled={dlLoading !== null}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors">
                    <DownloadIcon /> Download CSV
                  </button>
                </div>

                {/* Income */}
                <div className="px-6 pt-5 pb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Income</p>
                  <table className="w-full text-sm">
                    <tbody>
                      {incomeLines.map(l => (
                        <tr key={l.category} className="border-t border-slate-100">
                          <td className="py-2 text-slate-700">{l.category}</td>
                          <td className="py-2 text-right tabular-nums text-emerald-700 font-medium">{usd(l.amount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-slate-300 font-semibold">
                        <td className="py-2 text-slate-800">Total Income</td>
                        <td className="py-2 text-right tabular-nums text-emerald-700">{usd(totalIncome)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Expenses */}
                <div className="px-6 pt-4 pb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Expenses</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-1.5 font-semibold text-slate-500 text-xs">Category</th>
                        {multiAccount && accts.map(a => (
                          <th key={a.id} className="text-right py-1.5 font-semibold text-slate-500 text-xs pl-4 whitespace-nowrap">{a.name}</th>
                        ))}
                        <th className="text-right py-1.5 font-semibold text-slate-500 text-xs pl-4">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseLines.map(l => (
                        <tr key={l.category} className="border-t border-slate-100">
                          <td className="py-2 text-slate-700">{l.category}</td>
                          {multiAccount && accts.map(a => (
                            <td key={a.id} className="py-2 text-right tabular-nums text-slate-600 pl-4">
                              {l.byAccount[a.id] ? usd(l.byAccount[a.id]) : <span className="text-slate-300">—</span>}
                            </td>
                          ))}
                          <td className="py-2 text-right tabular-nums text-slate-800 font-medium pl-4">{usd(l.total)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-slate-300 font-semibold">
                        <td className="py-2 text-slate-800">Total Expenses</td>
                        {multiAccount && accts.map(a => (
                          <td key={a.id} className="py-2 text-right tabular-nums text-slate-700 pl-4">{usd(expenseTotalByAccount[a.id] ?? 0)}</td>
                        ))}
                        <td className="py-2 text-right tabular-nums text-slate-800 pl-4">{usd(totalExpenses)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Net */}
                <div className={`mx-6 mb-5 mt-3 px-4 py-3 rounded-xl flex items-center justify-between ${net >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <span className={`text-sm font-bold ${net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Net Income</span>
                  <span className={`text-lg font-bold tabular-nums ${net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{usd(net)}</span>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── CATEGORY INQUIRY TAB ────────────────────────────── */}
      {tab === 'inquiry' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Filters</h2>

            <DateRangePicker from={inqFrom} to={inqTo} onFrom={setInqFrom} onTo={setInqTo} />

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
              <select value={inqCategoryId} onChange={e => setInqCat(e.target.value)} className={selectCls}>
                <option value="">— Select a category —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Account</label>
              <select value={inqAccountId} onChange={e => setInqAccount(e.target.value)} className={selectCls}>
                <option value="">All accounts</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <button type="button" onClick={handleInquiry}
              disabled={inqLoading || !inqCategoryId}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-5 rounded-lg transition-colors text-sm">
              {inqLoading ? 'Loading…' : 'Run Inquiry'}
            </button>
          </div>

          {inqError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{inqError}</div>
          )}

          {inqResult && (
            <div className="space-y-4">
              {inqResult.accounts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400">
                  No transactions found for the selected filters.
                </div>
              ) : (() => {
                const flatTxs = inqResult.accounts
                  .flatMap(acct => acct.transactions.map(tx => ({ ...tx, accountName: acct.name })))
                  .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
                const balanced = Math.abs(inqResult.net) < 0.01
                return (
                  <>
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Transactions</span>
                        <span className="text-xs text-slate-400">{flatTxs.length} total</span>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-2.5 whitespace-nowrap">Date</th>
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5 whitespace-nowrap">Account</th>
                            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Description</th>
                            <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-2.5">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {flatTxs.map(tx => (
                            <tr key={tx.id} className="hover:bg-slate-50">
                              <td className="px-5 py-2.5 text-xs text-slate-400 whitespace-nowrap">{fmtDate(tx.date)}</td>
                              <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{tx.accountName}</td>
                              <td className="px-4 py-2.5 text-slate-800">
                                <p className="font-medium">{tx.description}</p>
                                {tx.payee && <p className="text-xs text-slate-400">{tx.payee}</p>}
                              </td>
                              <td className={`px-5 py-2.5 text-right font-medium tabular-nums whitespace-nowrap ${
                                tx.amount >= 0 ? 'text-emerald-600' : 'text-slate-700'
                              }`}>
                                {tx.amount >= 0 ? '+' : ''}{usd(tx.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Per-account subtotals + net */}
                    <div className={`rounded-2xl border overflow-hidden ${balanced ? 'border-emerald-200' : 'border-amber-200'}`}>
                      {inqResult.accounts.map((acct, i) => (
                        <div key={acct.id} className={`px-5 py-3 flex items-center justify-between text-sm bg-white ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                          <span className="text-slate-600">{acct.name}</span>
                          <span className={`font-semibold tabular-nums ${acct.total >= 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {acct.total >= 0 ? '+' : ''}{usd(acct.total)}
                          </span>
                        </div>
                      ))}
                      {inqResult.accounts.length > 1 && (
                        <div className={`px-5 py-3 flex items-center justify-between border-t ${
                          balanced ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                        }`}>
                          <span className={`text-sm font-semibold ${balanced ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {balanced ? '✓ Balanced — net is zero' : '⚠ Discrepancy detected'}
                          </span>
                          <span className={`text-base font-bold tabular-nums ${balanced ? 'text-emerald-700' : 'text-amber-700'}`}>
                            Net: {inqResult.net >= 0 ? '+' : ''}{usd(inqResult.net)}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
