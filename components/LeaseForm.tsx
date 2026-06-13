'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Tenant {
  id: string
  first_name: string
  last_name: string
}

interface LeaseTenant {
  id: string
  first_name: string
  last_name: string
  is_primary: boolean
}

interface LeaseFormProps {
  action: (formData: FormData) => Promise<{ error: string } | void>
  tenants: Tenant[]
  unitLabel: string
  defaultValues?: {
    lease_tenants?: LeaseTenant[]
    rent_amount?: number
    late_fee_amount?: number
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
  const router = useRouter()

  const [selectedTenants, setSelectedTenants] = useState<{ id: string; name: string }[]>(() =>
    (defaultValues?.lease_tenants ?? []).map(lt => ({
      id: lt.id,
      name: `${lt.last_name}, ${lt.first_name}`,
    }))
  )
  const [primaryId, setPrimaryId] = useState<string>(() => {
    const primary = defaultValues?.lease_tenants?.find(lt => lt.is_primary)
    return primary?.id ?? defaultValues?.lease_tenants?.[0]?.id ?? ''
  })
  const [pickerValue, setPickerValue] = useState('')

  function addTenant() {
    if (!pickerValue) return
    const tenant = tenants.find(t => t.id === pickerValue)
    if (!tenant || selectedTenants.find(s => s.id === pickerValue)) return
    const name = `${tenant.last_name}, ${tenant.first_name}`
    setSelectedTenants(prev => {
      const next = [...prev, { id: pickerValue, name }]
      if (!primaryId) setPrimaryId(pickerValue)
      return next
    })
    setPickerValue('')
  }

  function removeTenant(id: string) {
    setSelectedTenants(prev => {
      const next = prev.filter(t => t.id !== id)
      if (primaryId === id) setPrimaryId(next[0]?.id ?? '')
      return next
    })
  }

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

  const availableToAdd = tenants.filter(t => !selectedTenants.find(s => s.id === t.id))
  const inp = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm'
  const sel = `${inp} bg-white`

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
      {selectedTenants.map(t => (
        <input key={t.id} type="hidden" name="tenant_ids" value={t.id} />
      ))}
      <input type="hidden" name="primary_tenant_id" value={primaryId} />

      {/* Tenants */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Tenants</h3>
        <div className="flex gap-2 mb-3">
          <select value={pickerValue} onChange={e => setPickerValue(e.target.value)} className={`${sel} flex-1`}>
            <option value="">Add a tenant…</option>
            {availableToAdd.map(t => (
              <option key={t.id} value={t.id}>{t.last_name}, {t.first_name}</option>
            ))}
          </select>
          <button type="button" onClick={addTenant} disabled={!pickerValue}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors flex-shrink-0">
            Add
          </button>
        </div>
        {selectedTenants.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No tenants added</p>
        ) : (
          <ul className="space-y-2">
            {selectedTenants.map(t => (
              <li key={t.id} className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded-lg">
                <button type="button" onClick={() => setPrimaryId(t.id)}
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                    primaryId === t.id ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 hover:border-indigo-400'
                  }`}
                />
                <span className="text-sm text-slate-800 flex-1">{t.name}</span>
                {primaryId === t.id && (
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Primary</span>
                )}
                <button type="button" onClick={() => removeTenant(t.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedTenants.length > 1 && (
          <p className="text-xs text-slate-400 mt-2">Click the circle to change the primary tenant</p>
        )}
      </div>

      {/* Lease Terms */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Lease terms — {unitLabel}</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Monthly rent *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input name="rent_amount" type="number" step="0.01" required
                  defaultValue={defaultValues?.rent_amount}
                  className={`${inp} pl-7`} placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Late fee</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input name="late_fee_amount" type="number" step="0.01"
                  defaultValue={defaultValues?.late_fee_amount}
                  className={`${inp} pl-7`} placeholder="0.00" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Lease start *</label>
              <input name="lease_start" type="date" required
                defaultValue={defaultValues?.lease_start} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Lease end</label>
              <input name="lease_end" type="date"
                defaultValue={defaultValues?.lease_end} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Renewal date</label>
              <input name="renewal_date" type="date"
                defaultValue={defaultValues?.renewal_date} className={inp} />
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select name="status" defaultValue={defaultValues?.status ?? 'active'} className={sel}>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Security Deposit */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Security deposit</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount received</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input name="security_deposit" type="number" step="0.01"
                defaultValue={defaultValues?.security_deposit}
                className={`${inp} pl-7`} placeholder="0.00" />
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
                    className={`${inp} pl-7`} placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Return date</label>
                <input name="security_deposit_return_date" type="date"
                  defaultValue={defaultValues?.security_deposit_return_date}
                  className={inp} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
        <textarea name="notes" rows={3} defaultValue={defaultValues?.notes}
          className={`${inp} resize-none`} placeholder="Any notes about this lease…" />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm">
          {loading ? 'Saving…' : 'Update lease'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-colors text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
