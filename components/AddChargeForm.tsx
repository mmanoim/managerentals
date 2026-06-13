'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function today() {
  return new Date().toISOString().split('T')[0]
}

function firstOfMonth(ym: string) {
  return ym ? `${ym}-01` : today()
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function periodLabel(ym: string) {
  const [year, month] = ym.split('-')
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`
}

interface Props {
  action: (formData: FormData) => Promise<{ error: string } | void>
  defaultRentAmount: number
  defaultLateFee?: number
  initialSubtype?: 'rent' | 'late_fee' | 'adjustment'
}

export default function AddChargeForm({
  action, defaultRentAmount, defaultLateFee, initialSubtype = 'rent',
}: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [subtype, setSubtype] = useState<'rent' | 'late_fee' | 'adjustment'>(initialSubtype)
  const [period, setPeriod] = useState(currentMonth())
  const [amount, setAmount] = useState(String(defaultRentAmount))
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState(`Rent — ${periodLabel(currentMonth())}`)

  // Update defaults when subtype changes
  useEffect(() => {
    if (subtype === 'rent') {
      setAmount(String(defaultRentAmount))
      setDate(firstOfMonth(period))
      setDescription(`Rent — ${periodLabel(period)}`)
    } else if (subtype === 'late_fee') {
      setAmount(defaultLateFee ? String(defaultLateFee) : '')
      setDate(today())
      setDescription('Late fee')
    } else {
      setAmount('')
      setDate(today())
      setDescription('')
    }
  }, [subtype])

  // Update description + date when period changes (rent only)
  useEffect(() => {
    if (subtype === 'rent' && period) {
      setDescription(`Rent — ${periodLabel(period)}`)
      setDate(firstOfMonth(period))
    }
  }, [period])

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
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
      {/* Hidden subtype for server action */}
      <input type="hidden" name="subtype" value={subtype} />

      {/* Charge type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Charge type *</label>
        <div className="flex gap-2">
          {(['rent', 'late_fee', 'adjustment'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setSubtype(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                subtype === t
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-300'
              }`}
            >
              {t === 'rent' ? 'Rent' : t === 'late_fee' ? 'Late fee' : 'Adjustment'}
            </button>
          ))}
        </div>
      </div>

      {/* Period (rent only) */}
      {subtype === 'rent' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Period *</label>
          <input
            type="month"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            required
            className={inp}
          />
        </div>
      )}

      {/* Amount + Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount *</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              name="amount"
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className={`${inp} pl-7`}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
          <input
            name="entry_date"
            type="date"
            required
            value={date}
            onChange={e => setDate(e.target.value)}
            className={inp}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Description {subtype === 'adjustment' ? '*' : ''}
        </label>
        <input
          name="description"
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          required={subtype === 'adjustment'}
          placeholder={subtype === 'adjustment' ? 'Describe the adjustment…' : ''}
          className={inp}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm">
          {loading ? 'Saving…' : 'Add charge'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-colors text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
