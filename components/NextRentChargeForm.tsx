'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function periodLabel(ym: string) {
  if (!ym) return ''
  const [year, month] = ym.split('-')
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`
}

interface Props {
  action: (formData: FormData) => Promise<{ error: string } | void>
  nextPeriod: string       // YYYY-MM
  rentAmount: number
  lateFeeAmount?: number
}

export default function NextRentChargeForm({ action, nextPeriod, rentAmount, lateFeeAmount }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [period, setPeriod] = useState(nextPeriod)
  const [amount, setAmount] = useState(String(rentAmount))
  const [entryDate, setEntryDate] = useState(`${nextPeriod}-01`)
  const [includeLF, setIncludeLF] = useState(false)
  const [lfAmount, setLfAmount] = useState(lateFeeAmount ? String(lateFeeAmount) : '')

  useEffect(() => {
    if (period) setEntryDate(`${period}-01`)
  }, [period])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await action(new FormData(e.currentTarget))
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  const inp = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm'

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
      <input type="hidden" name="period" value={period} />

      {/* Period */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Rent period *</label>
        <input
          type="month"
          value={period}
          onChange={e => setPeriod(e.target.value)}
          required
          className={inp}
        />
        {period && (
          <p className="text-xs text-slate-400 mt-1">{periodLabel(period)}</p>
        )}
      </div>

      {/* Amount + Due date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Rent amount *</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              name="amount"
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className={`${inp} pl-7`}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Due date *</label>
          <input
            name="entry_date"
            type="date"
            required
            value={entryDate}
            onChange={e => setEntryDate(e.target.value)}
            className={inp}
          />
        </div>
      </div>

      {/* Late fee */}
      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="include_late_fee"
            checked={includeLF}
            onChange={e => setIncludeLF(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium text-slate-700">Include late fee</span>
          {!includeLF && lateFeeAmount && (
            <span className="text-xs text-slate-400">(${lateFeeAmount.toLocaleString()} from lease)</span>
          )}
        </label>
        {includeLF && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Late fee amount *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                name="late_fee_amount"
                type="number"
                step="0.01"
                required={includeLF}
                value={lfAmount}
                onChange={e => setLfAmount(e.target.value)}
                placeholder="0.00"
                className={`${inp} pl-7`}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm">
          {loading ? 'Saving…' : 'Create charge'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-colors text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
