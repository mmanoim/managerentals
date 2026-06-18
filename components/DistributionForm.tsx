'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DistributionFormProps {
  action: (formData: FormData) => Promise<{ error: string } | void>
  defaultValues?: {
    date?: string
    partner?: string
    source?: string
    destination?: string
    amount?: number
    notes?: string
  }
}

export default function DistributionForm({ action, defaultValues }: DistributionFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await action(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const inputClass = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm'

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
          <input name="date" type="date" required
            defaultValue={defaultValues?.date ?? today}
            className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Partner *</label>
          <select name="partner" required
            defaultValue={defaultValues?.partner ?? ''}
            className={`${inputClass} bg-white`}>
            <option value="">Select partner…</option>
            <option value="J">Jacob</option>
            <option value="M">Marina</option>
            <option value="JM">Both</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Source</label>
          <input name="source" type="text"
            defaultValue={defaultValues?.source ?? ''}
            placeholder="e.g. Joint, KHI PNC"
            className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Destination</label>
          <input name="destination" type="text"
            defaultValue={defaultValues?.destination ?? ''}
            placeholder="e.g. HELOC, Jacob Pers"
            className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount *</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
          <input name="amount" type="number" step="0.01" min="0.01" required
            defaultValue={defaultValues?.amount ?? undefined}
            placeholder="0.00"
            className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
        <textarea name="notes" rows={2}
          defaultValue={defaultValues?.notes ?? ''}
          className={`${inputClass} resize-none`}
          placeholder="Any additional detail…" />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm">
          {loading ? 'Saving…' : 'Save distribution'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-colors text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
