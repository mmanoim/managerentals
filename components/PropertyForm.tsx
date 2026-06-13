'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PropertyFormProps {
  action: (formData: FormData) => Promise<{ error: string } | void>
  defaultValues?: {
    address?: string
    city?: string | null
    state?: string | null
    zip?: string | null
    purchase_date?: string | null
    purchase_price?: number | null
    notes?: string | null
  }
}

export default function PropertyForm({ action, defaultValues }: PropertyFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Street address *</label>
        <input name="address" required defaultValue={defaultValues?.address}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          placeholder="123 Main St" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
          <input name="city" defaultValue={defaultValues?.city ?? undefined}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            placeholder="Springfield" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
          <input name="state" defaultValue={defaultValues?.state ?? undefined} maxLength={2}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            placeholder="NJ" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">ZIP code</label>
          <input name="zip" defaultValue={defaultValues?.zip ?? undefined}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            placeholder="07000" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Purchase date</label>
          <input name="purchase_date" type="date" defaultValue={defaultValues?.purchase_date?.split('T')[0] ?? undefined}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Purchase price</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
          <input name="purchase_price" type="number" step="0.01" defaultValue={defaultValues?.purchase_price ?? undefined}
            className="w-full pl-7 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            placeholder="0.00" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
        <textarea name="notes" rows={3} defaultValue={defaultValues?.notes ?? undefined}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
          placeholder="Any additional notes about this property…" />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm">
          {loading ? 'Saving…' : 'Save property'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-colors text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
