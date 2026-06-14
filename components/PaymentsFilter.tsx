'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface Props {
  properties: { id: string; address: string }[]
  units: { id: string; unit_label: string; property_id: string }[]
}

const METHODS = [
  { value: 'td_business', label: 'TD Business' },
  { value: 'cash',        label: 'Cash' },
  { value: 'cashapp',     label: 'Cash App' },
  { value: 'zelle',       label: 'Zelle' },
  { value: 'venmo',       label: 'Venmo' },
]

const sel = 'px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

export default function PaymentsFilter({ properties, units }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [propertyId, setPropertyId] = useState(searchParams.get('propertyId') ?? '')
  const [unitId, setUnitId]         = useState(searchParams.get('unitId') ?? '')
  const [method, setMethod]         = useState(searchParams.get('method') ?? '')

  const availableUnits = propertyId
    ? units.filter(u => u.property_id === propertyId)
    : units

  function push(overrides: { propertyId?: string; unitId?: string; method?: string }) {
    const next = { propertyId, unitId, method, ...overrides }
    const params = new URLSearchParams()
    if (next.propertyId) params.set('propertyId', next.propertyId)
    if (next.unitId)     params.set('unitId', next.unitId)
    if (next.method)     params.set('method', next.method)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function handleProperty(pid: string) {
    setPropertyId(pid)
    setUnitId('')
    push({ propertyId: pid, unitId: '' })
  }

  function handleUnit(uid: string) {
    setUnitId(uid)
    push({ unitId: uid })
  }

  function handleMethod(m: string) {
    setMethod(m)
    push({ method: m })
  }

  function clearAll() {
    setPropertyId(''); setUnitId(''); setMethod('')
    router.push(pathname)
  }

  const hasFilters = !!(propertyId || unitId || method)

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <select value={propertyId} onChange={e => handleProperty(e.target.value)} className={sel}>
        <option value="">All properties</option>
        {properties.map(p => (
          <option key={p.id} value={p.id}>{p.address}</option>
        ))}
      </select>

      <select value={unitId} onChange={e => handleUnit(e.target.value)} className={sel}
        disabled={!propertyId}>
        <option value="">{propertyId ? 'All units' : 'Select property first'}</option>
        {propertyId && availableUnits.map(u => (
          <option key={u.id} value={u.id}>{u.unit_label}</option>
        ))}
      </select>

      <select value={method} onChange={e => handleMethod(e.target.value)} className={sel}>
        <option value="">All methods</option>
        {METHODS.map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>

      {hasFilters && (
        <button onClick={clearAll}
          className="text-sm text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors">
          Clear filters ×
        </button>
      )}
    </div>
  )
}
