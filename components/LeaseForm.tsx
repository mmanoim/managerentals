'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Tenant {
  id: string
  first_name: string
  last_name: string
}

interface LeaseFormProps {
  action: (formData: FormData) => Promise<{ error: string } | void>
  tenants: Tenant[]
  unitLabel: string
  defaultValues?: {
    primary_tenant_id?: string
    co_tenant_id?: string
    rent_amount?: number
    lease_start?: string
    lease_end?: string
    renewal_date?: string
    status?: string
    security_deposit?: number
    security_deposit_returned?: number
    security_deposit_return_date?: string
    notes?: string
  }
  isEdit?: boolean
}

export default function LeaseForm({ action, tenants, unitLabel, defaultValues, isEdit }: LeaseFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [primaryId, setPrimaryId] = useState(defaultValues?.primary_tenant_id ?? '')
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
  const selectClass = `${inputClass} bg-white`

  const availableCoTenants = tenants.filter(t => t.id !== primaryId)

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
      {/* Tenant(s) */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Tenants</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Primary tenant *</label>
            <select name="primary_tenant_id" required value={primaryId}
              onChange={e => setPrimaryId(e.target.value)} className={selectClass}>
              <option value="">Select tenant…</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.last_name}, {t.first_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Co-tenant <span className="text-slate-400 font-normal">(optional)</span></label>
            <select name="co_tenant_id" defaultValue={defaultValues?.co_tenant_id ?? ''} className={selectClass}>
              <option value="">None</option>
              {availableCoTenants.map(t => (
                <option key={t.id} value={t.id}>{t.last_name}, {t.first_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Rent */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Lease terms — {unitLabel}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Monthly rent *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input name="rent_amount" type="number" step="0.01" required
                defaultValue={defaultValues?.rent_amount}
                className={`${inputClass} pl-7`} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Lease start *</label>
              <input name="lease_start" type="date" required
                defaultValue={defaultValues?.lease_start}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Lease end</label>
              <input name="lease_end" type="date"
                defaultValue={defaultValues?.lease_end}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Renewal date</label>
              <input name="renewal_date" type="date"
                defaultValue={defaultValues?.renewal_date}
                className={inputClass} />
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select name="status" defaultValue={defaultValues?.status ?? 'active'} className={selectClass}>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Security deposit */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Security deposit</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount received</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input name="security_deposit" type="number" step="0.01"
                defaultValue={defaultValues?.security_deposit}
                className={`${inputClass} pl-7`} placeholder="0.00" />
            </div>
          </div>
          {isEdit && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount returned</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input name="security_deposit_returned" type="number" step="0.01"
                    defaultValue={defaultValues?.security_deposit_returned}
                    className={`${inputClass} pl-7`} placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Return date</label>
                <input name="security_deposit_return_date" type="date"
                  defaultValue={defaultValues?.security_deposit_return_date}
                  className={inputClass} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
        <textarea name="notes" rows={3} defaultValue={defaultValues?.notes}
          className={`${inputClass} resize-none`}
          placeholder="Any notes about this lease…" />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm">
          {loading ? 'Saving…' : isEdit ? 'Update lease' : 'Create lease'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-colors text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
