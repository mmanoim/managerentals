'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ColMap {
  dateCol: string
  descCol: string
  amountMode: 'single' | 'split'
  amountCol: string
  debitCol: string
  creditCol: string
}

interface PreviewRow {
  rawDate: string
  date: string
  description: string
  amount: number
  isDuplicate: boolean
  include: boolean
  valid: boolean
}

type Step = 'upload' | 'mapping' | 'preview' | 'done'

interface ImportRowData { date: string; description: string; amount: number }
type ImportAction = (rows: ImportRowData[], batchId: string) => Promise<{ imported: number } | { error: string }>
type UndoAction = (batchId: string) => Promise<void>

interface Props {
  accountId: string
  accountName: string
  existingTransactions: ImportRowData[]
  importAction: ImportAction
  undoAction: UndoAction
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findHeader(headers: string[], patterns: string[]): string {
  const lower = headers.map(h => h.toLowerCase().trim())
  for (const p of patterns) {
    const idx = lower.findIndex(h => h === p || h.includes(p))
    if (idx !== -1) return headers[idx]
  }
  return ''
}

function autoDetect(headers: string[]): ColMap | null {
  const dateCol = findHeader(headers, ['date', 'posted', 'transaction date', 'trans. date', 'trans date'])
  const descCol = findHeader(headers, ['description', 'memo', 'narrative', 'payee', 'details', 'transaction'])
  const amountCol = findHeader(headers, ['amount'])
  const debitCol = findHeader(headers, ['debit', 'withdrawal', 'withdrawl', 'debit amount'])
  const creditCol = findHeader(headers, ['credit', 'deposit', 'credit amount'])

  if (!dateCol || !descCol) return null

  if (amountCol) {
    return { dateCol, descCol, amountMode: 'single', amountCol, debitCol: '', creditCol: '' }
  }
  if (debitCol && creditCol) {
    return { dateCol, descCol, amountMode: 'split', amountCol: '', debitCol, creditCol }
  }
  return null
}

function parseDate(raw: string): string {
  const s = (raw ?? '').trim()
  // MM/DD/YYYY or M/D/YY
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m1) {
    const year = m1[3].length === 2 ? `20${m1[3]}` : m1[3]
    return `${year}-${m1[1].padStart(2, '0')}-${m1[2].padStart(2, '0')}`
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // MM-DD-YYYY
  const m2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (m2) return `${m2[3]}-${m2[1].padStart(2, '0')}-${m2[2].padStart(2, '0')}`
  return ''
}

function parseAmount(raw: string): number {
  if (!raw) return 0
  // Handle parentheses as negative: (250.00) → -250
  const neg = raw.trim().startsWith('(') && raw.trim().endsWith(')')
  const cleaned = raw.replace(/[$,\s()]/g, '')
  const val = parseFloat(cleaned) || 0
  return neg ? -Math.abs(val) : val
}

function normalizeAmt(n: number): number {
  return parseFloat(n.toFixed(2))
}

function buildRows(
  rawRows: Record<string, string>[],
  cm: ColMap,
  existingKeys: Set<string>,
): PreviewRow[] {
  return rawRows.map(row => {
    const rawDate = (row[cm.dateCol] ?? '').trim()
    const date = parseDate(rawDate)
    const description = (row[cm.descCol] ?? '').trim()
    const amount = cm.amountMode === 'single'
      ? parseAmount(row[cm.amountCol] ?? '')
      : parseAmount(row[cm.creditCol] ?? '') - parseAmount(row[cm.debitCol] ?? '')
    const normAmt = normalizeAmt(amount)
    const valid = !!date && !!description && amount !== 0
    const key = `${date}|${description}|${normAmt}`
    const isDuplicate = valid && existingKeys.has(key)
    return { rawDate, date, description, amount: normAmt, isDuplicate, include: valid && !isDuplicate, valid }
  })
}

function fmtAmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(n))
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const selectCls = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

// ── Component ─────────────────────────────────────────────────────────────────

export default function CsvImporter({
  accountId,
  existingTransactions,
  importAction,
  undoAction,
}: Props) {
  const router = useRouter()

  const existingKeys = useMemo(
    () => new Set(
      existingTransactions.map(t =>
        `${t.date}|${t.description}|${normalizeAmt(Number(t.amount))}`
      )
    ),
    // stable at mount — no deps needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [step, setStep] = useState<Step>('upload')
  const [error, setError] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [colMap, setColMap] = useState<ColMap>({
    dateCol: '', descCol: '', amountMode: 'single', amountCol: '', debitCol: '', creditCol: '',
  })
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [importing, setImporting] = useState(false)
  const [doneResult, setDoneResult] = useState<{ imported: number; skipped: number; batchId: string } | null>(null)
  const [undoing, setUndoing] = useState(false)

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file.')
      return
    }
    setError(null)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const hdrs = results.meta.fields ?? []
        const raws = results.data
        setHeaders(hdrs)
        setRawRows(raws)

        const detected = autoDetect(hdrs)
        if (detected) {
          setColMap(detected)
          setRows(buildRows(raws, detected, existingKeys))
          setStep('preview')
        } else {
          setColMap({
            dateCol: hdrs[0] ?? '',
            descCol: hdrs[1] ?? '',
            amountMode: 'single',
            amountCol: hdrs[2] ?? '',
            debitCol: '',
            creditCol: '',
          })
          setStep('mapping')
        }
      },
      error(err) { setError(err.message) },
    })
  }

  function applyMapping() {
    if (!colMap.dateCol || !colMap.descCol) {
      setError('Please select Date and Description columns.')
      return
    }
    if (colMap.amountMode === 'single' && !colMap.amountCol) {
      setError('Please select the Amount column.')
      return
    }
    if (colMap.amountMode === 'split' && (!colMap.debitCol || !colMap.creditCol)) {
      setError('Please select both Debit and Credit columns.')
      return
    }
    setError(null)
    setRows(buildRows(rawRows, colMap, existingKeys))
    setStep('preview')
  }

  function toggleRow(idx: number) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, include: !r.include } : r))
  }

  function toggleAll(checked: boolean) {
    setRows(prev => prev.map(r => r.valid ? { ...r, include: checked } : r))
  }

  async function handleImport() {
    const toImport = rows.filter(r => r.include && r.valid)
    if (toImport.length === 0) { setError('No valid rows selected.'); return }
    setImporting(true)
    setError(null)
    const batchId = crypto.randomUUID()
    const result = await importAction(
      toImport.map(({ date, description, amount }) => ({ date, description, amount })),
      batchId,
    )
    setImporting(false)
    if ('error' in result) { setError(result.error); return }
    const skipped = rows.length - toImport.length
    setDoneResult({ imported: result.imported, skipped, batchId })
    setStep('done')
  }

  async function handleUndo() {
    if (!doneResult) return
    setUndoing(true)
    await undoAction(doneResult.batchId)
    router.push(`/accounts/${accountId}`)
  }

  const validRows = rows.filter(r => r.valid)
  const toImportCount = rows.filter(r => r.include && r.valid).length
  const duplicateCount = rows.filter(r => r.isDuplicate).length
  const invalidCount = rows.filter(r => !r.valid).length
  const allChecked = validRows.length > 0 && validRows.every(r => r.include)

  // ── Done ──────────────────────────────────────────────────────────────────

  if (step === 'done' && doneResult) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-md mx-auto">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">
          {doneResult.imported} transaction{doneResult.imported !== 1 ? 's' : ''} imported
        </h2>
        {doneResult.skipped > 0 && (
          <p className="text-slate-500 text-sm">{doneResult.skipped} row{doneResult.skipped !== 1 ? 's' : ''} skipped</p>
        )}
        <div className="flex flex-col items-center gap-3 mt-7">
          <button
            onClick={() => router.push(`/accounts/${accountId}`)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-2.5 rounded-lg text-sm transition-colors"
          >
            View account register
          </button>
          <button
            onClick={handleUndo}
            disabled={undoing}
            className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50 transition-colors"
          >
            {undoing ? 'Undoing…' : 'Undo this import'}
          </button>
        </div>
      </div>
    )
  }

  // ── Column mapping ─────────────────────────────────────────────────────────

  if (step === 'mapping') {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Map columns</h2>
          <p className="text-sm text-slate-500">
            Couldn't auto-detect this CSV format. Select which column is which.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date column *</label>
            <select value={colMap.dateCol}
              onChange={e => setColMap(m => ({ ...m, dateCol: e.target.value }))}
              className={selectCls}>
              <option value="">— Select —</option>
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description column *</label>
            <select value={colMap.descCol}
              onChange={e => setColMap(m => ({ ...m, descCol: e.target.value }))}
              className={selectCls}>
              <option value="">— Select —</option>
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Amount format</label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="amountMode" checked={colMap.amountMode === 'single'}
                onChange={() => setColMap(m => ({ ...m, amountMode: 'single' }))} />
              Single "Amount" column
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="amountMode" checked={colMap.amountMode === 'split'}
                onChange={() => setColMap(m => ({ ...m, amountMode: 'split' }))} />
              Separate Debit / Credit columns
            </label>
          </div>
        </div>

        {colMap.amountMode === 'single' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount column *</label>
            <select value={colMap.amountCol}
              onChange={e => setColMap(m => ({ ...m, amountCol: e.target.value }))}
              className={selectCls}>
              <option value="">— Select —</option>
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Debit column (money out) *</label>
              <select value={colMap.debitCol}
                onChange={e => setColMap(m => ({ ...m, debitCol: e.target.value }))}
                className={selectCls}>
                <option value="">— Select —</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Credit column (money in) *</label>
              <select value={colMap.creditCol}
                onChange={e => setColMap(m => ({ ...m, creditCol: e.target.value }))}
                className={selectCls}>
                <option value="">— Select —</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={applyMapping}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-lg text-sm transition-colors">
            Preview rows
          </button>
          <button onClick={() => { setStep('upload'); setError(null) }}
            className="text-slate-600 hover:text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-100 text-sm transition-colors">
            Back
          </button>
        </div>
      </div>
    )
  }

  // ── Preview ────────────────────────────────────────────────────────────────

  if (step === 'preview') {
    return (
      <div className="space-y-4">
        {/* Summary / actions bar */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex items-center gap-4 flex-wrap">
          <span className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{rows.length}</span> rows parsed
          </span>
          {duplicateCount > 0 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
              {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''} pre-deselected
            </span>
          )}
          {invalidCount > 0 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
              {invalidCount} invalid (no date or zero amount)
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <button onClick={() => { setStep('upload'); setError(null) }}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium">
              ← Different file
            </button>
            <button
              onClick={handleImport}
              disabled={importing || toImportCount === 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2 px-5 rounded-lg text-sm transition-colors"
            >
              {importing ? 'Importing…' : `Import ${toImportCount} transaction${toImportCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Preview table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={e => toggleAll(e.target.checked)}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className={[
                    'transition-opacity',
                    !row.valid ? 'opacity-35' : '',
                    !row.include && row.valid ? 'opacity-50' : '',
                    row.isDuplicate && row.include ? 'bg-amber-50/40' : '',
                  ].join(' ')}
                >
                  <td className="px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={row.include && row.valid}
                      disabled={!row.valid}
                      onChange={() => toggleRow(i)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap tabular-nums text-xs">
                    {row.date || row.rawDate}
                  </td>
                  <td className="px-4 py-2.5 text-slate-900 max-w-xs">
                    <span className="block truncate">{row.description || '—'}</span>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono tabular-nums whitespace-nowrap ${row.amount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {row.amount >= 0 ? '+' : '−'}{fmtAmt(row.amount)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {!row.valid ? (
                      <span className="text-xs font-medium text-slate-400">Invalid</span>
                    ) : row.isDuplicate ? (
                      <span className="text-xs font-medium text-amber-600">Duplicate</span>
                    ) : (
                      <span className="text-xs font-medium text-emerald-600">New</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
      <div
        className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/20 transition-colors"
        onDragOver={e => { e.preventDefault() }}
        onDrop={e => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        onClick={() => document.getElementById('csv-file-input')?.click()}
      >
        <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-slate-700 font-semibold">Drop a CSV here, or click to browse</p>
        <p className="text-slate-400 text-sm mt-1">TD Bank, Cash App, and most bank formats supported</p>
        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-500 space-y-2">
        <p className="font-medium text-slate-700 text-xs uppercase tracking-wide">Supported CSV formats</p>
        <div className="space-y-1 text-xs">
          <p><span className="font-medium text-slate-600">TD Bank:</span> Date, Type, Description, Debit, Credit, Balance</p>
          <p><span className="font-medium text-slate-600">Single amount:</span> Any CSV with Date, Description, Amount columns</p>
          <p className="text-slate-400 pt-1">If auto-detection fails, you'll map the columns manually.</p>
        </div>
      </div>
    </div>
  )
}
