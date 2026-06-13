'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const METHODS = [
  { value: 'check', label: 'Check', ref: 'Check #' },
  { value: 'cash', label: 'Cash', ref: null },
  { value: 'cashapp', label: 'Cash App', ref: 'Transaction ref' },
  { value: 'zelle', label: 'Zelle', ref: 'Transaction ref' },
  { value: 'venmo', label: 'Venmo', ref: 'Transaction ref' },
]

interface Part {
  key: string
  method: string
  amount: string
  reference: string
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface Props {
  action: (formData: FormData) => Promise<{ error: string } | void>
  rentAmount: number
}

export default function RecordPaymentForm({ action, rentAmount }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [parts, setParts] = useState<Part[]>([
    { key: crypto.randomUUID(), method: '', amount: '', reference: '' },
  ])

  const total = parts.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  const diff = total - rentAmount

  function addPart() {
    setParts(prev => [...prev, { key: crypto.randomUUID(), method: '', amount: '', reference: '' }])
  }

  function removePart(key: string) {
    setParts(prev => prev.filter(p => p.key !== key))
  }

  function updatePart(key: string, field: keyof Part, value: string) {
    setParts(prev => prev.map(p => p.key === key ? { ...p, [field]: value } : p))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await action(new FormData(e.currentTarget))
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  const inp = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm'
  const sel = `${inp} bg-white`

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
      {/* Period & date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment for *</label>
          <input name="period_month" type="month" required
            defaultValue={currentMonth()} className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Date received *</label>
          <input name="received_on" type="date" required
            defaultValue={today()} className={inp} />
        </div>
      </div>

      {/* Payment breakdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Payment breakdown</h3>
          <button type="button" onClick={addPart}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            + Add method
          </button>
        </div>

        <div className="space-y-2">
          {parts.map((part) => {
            const methodDef = METHODS.find(m => m.value === part.method)
            return (
              <div key={part.key} className="flex gap-2 items-start">
                <select
                  name="part_method"
                  value={part.method}
                  onChange={e => updatePart(part.key, 'method', e.target.value)}
                  required
                  className={`${sel} w-36 flex-shrink-0`}
                >
                  <option value="">Method…</option>
                  {METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                <div className="relative w-32 flex-shrink-0">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    name="part_amount"
                    type="number"
                    step="0.01"
                    required
                    value={part.amount}
                    onChange={e => updatePart(part.key, 'amount', e.target.value)}
                    placeholder="0.00"
                    className={`${inp} pl-7`}
                  />
                </div>

                {methodDef?.ref !== null && (
                  <input
                    name="part_reference"
                    value={part.reference}
                    onChange={e => updatePart(part.key, 'reference', e.target.value)}
                    placeholder={methodDef?.ref ?? 'Reference (optional)'}
                    className={`${inp} flex-1`}
                  />
                )}
                {methodDef?.ref === null && (
                  <input type="hidden" name="part_reference" value="" />
                )}

                {parts.length > 1 && (
                  <button type="button" onClick={() => removePart(part.key)}
                    className="mt-2.5 text-slate-400 hover:text-red-500 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Total */}
        {parts.some(p => parseFloat(p.amount) > 0) && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Total received</span>
            <div className="text-right">
              <span className={`text-base font-bold ${
                diff === 0 ? 'text-green-600' : diff < 0 ? 'text-amber-600' : 'text-red-600'
              }`}>
                ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <p className={`text-xs mt-0.5 ${
                diff === 0 ? 'text-green-500' : diff < 0 ? 'text-amber-500' : 'text-red-500'
              }`}>
                {diff === 0
                  ? 'Full payment'
                  : diff < 0
                  ? `$${Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: 2 })} short of $${rentAmount.toLocaleString()}`
                  : `$${diff.toLocaleString('en-US', { minimumFractionDigits: 2 })} over rent`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
        <textarea name="notes" rows={2}
          className={`${inp} resize-none`}
          placeholder="e.g. Received late, pending check clearance…" />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm">
          {loading ? 'Saving…' : 'Record payment'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-colors text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
