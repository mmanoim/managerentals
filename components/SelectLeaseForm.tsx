'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LeaseTenantRow {
  is_primary: boolean
  tenant: { first_name: string; last_name: string }
}
interface Lease {
  id: string
  unit_id: string
  status: string
  rent_amount: number
  lease_tenants: LeaseTenantRow[]
}

interface Props {
  properties: { id: string; address: string }[]
  units: { id: string; unit_label: string; property_id: string }[]
  leases: Lease[]
}

function tenantName(leaseTenants: LeaseTenantRow[]) {
  const sorted = [...leaseTenants].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
  return sorted.map(lt => {
    const t = Array.isArray(lt.tenant) ? lt.tenant[0] : lt.tenant
    return `${t.first_name} ${t.last_name}`
  }).join(' & ')
}

const sel = 'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400'

export default function SelectLeaseForm({ properties, units, leases }: Props) {
  const router = useRouter()
  const [propertyId, setPropertyId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [leaseId, setLeaseId] = useState('')

  const filteredUnits = propertyId ? units.filter(u => u.property_id === propertyId) : []
  const filteredLeases = unitId ? leases.filter(l => l.unit_id === unitId) : []

  function handleProperty(pid: string) {
    setPropertyId(pid)
    setUnitId('')
    setLeaseId('')
  }

  function handleUnit(uid: string) {
    setUnitId(uid)
    setLeaseId('')
    // auto-select if only one lease for this unit
    const matches = leases.filter(l => l.unit_id === uid)
    if (matches.length === 1) setLeaseId(matches[0].id)
  }

  function handleContinue() {
    if (leaseId) router.push(`/leases/${leaseId}/payments/new`)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Property
        </label>
        <select value={propertyId} onChange={e => handleProperty(e.target.value)} className={sel}>
          <option value="">Select a property…</option>
          {properties.map(p => (
            <option key={p.id} value={p.id}>{p.address}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Unit
        </label>
        <select value={unitId} onChange={e => handleUnit(e.target.value)} className={sel}
          disabled={!propertyId}>
          <option value="">{propertyId ? 'Select a unit…' : 'Select property first'}</option>
          {filteredUnits.map(u => (
            <option key={u.id} value={u.id}>{u.unit_label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Lease
        </label>
        <select value={leaseId} onChange={e => setLeaseId(e.target.value)} className={sel}
          disabled={!unitId}>
          <option value="">{unitId ? 'Select a lease…' : 'Select unit first'}</option>
          {filteredLeases.map(l => (
            <option key={l.id} value={l.id}>
              {tenantName(l.lease_tenants)} — ${Number(l.rent_amount).toLocaleString()}/mo
            </option>
          ))}
        </select>
      </div>

      <div className="pt-2">
        <button onClick={handleContinue} disabled={!leaseId}
          className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          Continue →
        </button>
      </div>
    </div>
  )
}
