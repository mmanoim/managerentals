'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createUnit, updateUnit, archiveUnit } from '@/app/actions/properties'

interface LeaseTenant {
  is_primary: boolean
  tenant: { first_name: string; last_name: string }
}

interface ActiveLease {
  id: string
  rent_amount: number
  lease_start: string
  lease_end: string | null
  renewal_date: string | null
  lease_tenants: LeaseTenant[]
}

interface Unit {
  id: string
  unit_label: string
  monthly_rent: number | null
  property_id: string
  active_lease: ActiveLease | null
}

function tenantNames(lease: ActiveLease) {
  const sorted = [...lease.lease_tenants].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
  return sorted.map(lt => `${lt.tenant.first_name} ${lt.tenant.last_name}`).join(' & ')
}

export default function UnitList({ units, propertyId }: { units: Unit[]; propertyId: string }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    await createUnit(propertyId, new FormData(e.currentTarget))
    setShowAdd(false)
    setLoading(false)
  }

  async function handleEdit(unitId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    await updateUnit(unitId, propertyId, new FormData(e.currentTarget))
    setEditingId(null)
    setLoading(false)
  }

  async function handleArchive(unitId: string) {
    if (!confirm('Archive this unit?')) return
    await archiveUnit(unitId, propertyId)
  }

  const inputClass = 'flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="space-y-3">
      {units.map((unit) => (
        <div key={unit.id} className="bg-white border border-slate-200 rounded-xl p-4">
          {editingId === unit.id ? (
            <form onSubmit={(e) => handleEdit(unit.id, e)} className="flex items-center gap-3">
              <input name="unit_label" defaultValue={unit.unit_label} required
                className={inputClass} placeholder="Unit label" />
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input name="monthly_rent" type="number" step="0.01" defaultValue={unit.monthly_rent ?? ''}
                  className="w-28 pl-6 pr-2 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Target rent" />
              </div>
              <button type="submit" disabled={loading} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Save</button>
              <button type="button" onClick={() => setEditingId(null)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            </form>
          ) : (
            <div>
              {/* Unit header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold flex-shrink-0">
                    {unit.unit_label[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{unit.unit_label}</p>
                    {unit.monthly_rent && (
                      <p className="text-xs text-slate-400">Target: ${Number(unit.monthly_rent).toLocaleString()}/mo</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditingId(unit.id)} className="text-xs text-slate-500 hover:text-slate-700 font-medium">Edit</button>
                  <button onClick={() => handleArchive(unit.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Archive</button>
                </div>
              </div>

              {/* Lease info */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                {unit.active_lease ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {tenantNames(unit.active_lease)}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-sm text-slate-600">
                          ${Number(unit.active_lease.rent_amount).toLocaleString()}/mo
                        </span>
                        {unit.active_lease.renewal_date && (
                          <span className="text-xs text-slate-400">
                            Renewal {new Date(unit.active_lease.renewal_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/leases/${unit.active_lease.id}/edit?propertyId=${propertyId}`}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 hover:border-indigo-300 transition-colors"
                    >
                      Manage lease
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 italic">Vacant</span>
                    <Link
                      href={`/properties/${propertyId}/units/${unit.id}/leases/new`}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 hover:border-indigo-300 transition-colors"
                    >
                      + Add lease
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {showAdd ? (
        <form onSubmit={handleAdd} className="bg-white border-2 border-dashed border-indigo-300 rounded-xl p-4 flex items-center gap-3">
          <input name="unit_label" required autoFocus
            className={inputClass} placeholder="e.g. Unit 1, Apt 2A, Garage" />
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input name="monthly_rent" type="number" step="0.01"
              className="w-28 pl-6 pr-2 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Target/mo" />
          </div>
          <button type="submit" disabled={loading} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Add</button>
          <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
        </form>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors text-sm font-medium"
        >
          + Add unit
        </button>
      )}
    </div>
  )
}
