'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Tenant { id: string; first_name: string; last_name: string }
interface Property { id: string; address: string; city: string }
interface Unit { id: string; unit_label: string; property_id: string; monthly_rent: number | null }

interface Props {
  action: (formData: FormData) => Promise<{ error: string } | void>
  tenants: Tenant[]
  properties: Property[]
  units: Unit[]
  defaultUnitId?: string
  defaultPropertyId?: string
}

export default function NewLeaseForm({
  action, tenants, properties, units, defaultUnitId, defaultPropertyId,
}: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [selectedTenants, setSelectedTenants] = useState<{ id: string; name: string }[]>([])
  const [primaryId, setPrimaryId] = useState('')
  const [pickerValue, setPickerValue] = useState('')

  const [propId, setPropId] = useState(defaultPropertyId ?? '')
  const [unitId, setUnitId] = useState(defaultUnitId ?? '')
  const [rentAmount, setRentAmount] = useState(() => {
    const u = units.find(u => u.id === defaultUnitId)
    return u?.monthly_rent != null ? String(u.monthly_rent) : ''
  })

  const filteredUnits = propId ? units.filter(u => u.property_id === propId) : units

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

  function handlePropChange(pid: string) {
    setPropId(pid)
    const u = units.find(u => u.id === unitId)
    if (u && u.property_id !== pid) {
      setUnitId('')
      setRentAmount('')
    }
  }

  function handleUnitChange(uid: string) {
    setUnitId(uid)
    const u = units.find(u => u.id === uid)
    if (u?.monthly_rent != null) setRentAmount(String(u.monthly_rent))
    else setRentAmount('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (selectedTenants.length === 0) { setError('Please add at least one tenant'); return }
    if (!unitId) { setError('Please select a unit'); return }
    setLoading(true)
    setError(null)
    const result = await action(new FormData(e.currentTarget))
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  const availableToAdd = tenants.filter(t => !selectedTenants.find(s => s.id === t.id))
  const inp = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm'
  const sel = `${inp} bg-white`

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {selectedTenants.map(t => (
        <input key={t.id} type="hidden" name="tenant_ids" value={t.id} />
      ))}
      <input type="hidden" name="primary_tenant_id" value={primaryId} />
      <input type="hidden" name="unit_id" value={unitId} />

      {/* Step 1: Tenants */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">1</span>
          Tenants
        </h2>
        <div className="flex gap-2 mb-3">
          <select value={pickerValue} onChange={e => setPickerValue(e.target.value)} className={`${sel} flex-1`}>
            <option value="">Select a tenant to add…</option>
            {availableToAdd.map(t => (
              <option key={t.id} value={t.id}>{t.last_name}, {t.first_name}</option>
            ))}
          </select>
          <button type="button" onClick={addTenant} disabled={!pickerValue}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors flex-shrink-0">
            Add
          </button>
        </div>
        {selectedTenants.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No tenants added yet</p>
        ) : (
          <>
            <ul className="space-y-2">
              {selectedTenants.map(t => (
                <li key={t.id} className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded-lg">
                  <button type="button" onClick={() => setPrimaryId(t.id)}
                    title="Set as primary"
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
            {selectedTenants.length > 1 && (
              <p className="text-xs text-slate-400 mt-2">Click the circle to set the primary tenant</p>
            )}
          </>
        )}
      </section>

      {/* Step 2: Property & Unit */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">2</span>
          Property &amp; unit
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Property</label>
            <select value={propId} onChange={e => handlePropChange(e.target.value)} className={sel}>
              <option value="">All properties</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.address}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit *</label>
            <select value={unitId} onChange={e => handleUnitChange(e.target.value)} className={sel}>
              <option value="">Select unit…</option>
              {filteredUnits.map(u => (
                <option key={u.id} value={u.id}>{u.unit_label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Step 3: Lease Terms */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 uppercase tracking-wide">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">3</span>
          Lease terms
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Monthly rent *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input name="rent_amount" type="number" step="0.01" required
                value={rentAmount} onChange={e => setRentAmount(e.target.value)}
                className={`${inp} pl-7`} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Late fee</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input name="late_fee_amount" type="number" step="0.01"
                className={`${inp} pl-7`} placeholder="0.00" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Lease start *</label>
            <input name="lease_start" type="date" required className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Lease end</label>
            <input name="lease_end" type="date" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Renewal date</label>
            <input name="renewal_date" type="date" className={inp} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Security deposit</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input name="security_deposit" type="number" step="0.01"
              className={`${inp} pl-7`} placeholder="0.00" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
          <textarea name="notes" rows={3}
            className={`${inp} resize-none`} placeholder="Any notes about this lease…" />
        </div>
      </section>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 pb-2">
        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm">
          {loading ? 'Creating…' : 'Create lease'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-colors text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
