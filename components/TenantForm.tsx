'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TenantFormProps {
  action: (formData: FormData) => Promise<{ error: string } | void>
  defaultValues?: {
    first_name?: string
    last_name?: string
    email?: string | null
    phone?: string | null
    notes?: string | null
  }
}

export default function TenantForm({ action, defaultValues }: TenantFormProps) {
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

  const inputClass = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm'

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">First name *</label>
          <input name="first_name" required defaultValue={defaultValues?.first_name}
            className={inputClass} placeholder="Jane" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Last name *</label>
          <input name="last_name" required defaultValue={defaultValues?.last_name}
            className={inputClass} placeholder="Smith" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <input name="email" type="email" defaultValue={defaultValues?.email ?? undefined}
            className={inputClass} placeholder="jane@email.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
          <input name="phone" type="tel" defaultValue={defaultValues?.phone ?? undefined}
            className={inputClass} placeholder="(555) 000-0000" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
        <textarea name="notes" rows={3} defaultValue={defaultValues?.notes ?? undefined}
          className={`${inputClass} resize-none`}
          placeholder="Any additional notes…" />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm">
          {loading ? 'Saving…' : 'Save tenant'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-colors text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
