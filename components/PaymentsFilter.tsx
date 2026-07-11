'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface Props {
  properties: { id: string; address: string }[]
  units: { id: string; unit_label: string; property_id: string }[]
  dateFrom?: string
  dateTo?: string
}

const METHODS = [
  { value: 'td_business', label: 'TD Business' },
  { value: 'td_joint',      label: 'TD Joint' },
  { value: 'jacob_personal', label: 'Jacob Personal' },
  { value: 'cash',        label: 'Cash' },
  { value: 'cashapp',     label: 'Cash App' },
  { value: 'zelle',       label: 'Zelle' },
  { value: 'venmo',       label: 'Venmo' },
]

const sel = 'px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

export default function PaymentsFilter({ properties, units, dateFrom, dateTo }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [propertyId, setPropertyId] = useState(searchParams.get('propertyId') ?? '')
  const [unitId, setUnitId]         = useState(searchParams.get('unitId') ?? '')
  const [method, setMethod]         = useState(searchParams.get('method') ?? '')
  const [dateFromVal, setDateFrom]  = useState(searchParams.get('date_from') ?? '')
  const [dateToVal, setDateTo]      = useState(searchParams.get('date_to') ?? '')

  const availableUnits = propertyId
    ? units.filter(u => u.property_id === propertyId)
    : units

  function push(overrides: { propertyId?: string; unitId?: string; method?: string; date_from?: string; date_to?: string }) {
    const next = { propertyId, unitId, method, date_from: dateFromVal, date_to: dateToVal, ...overrides }
    const params = new URLSearchParams()
    if (next.propertyId)  params.set('propertyId', next.propertyId)
    if (next.unitId)      params.set('unitId', next.unitId)
    if (next.method)      params.set('method', next.method)
    if (next.date_from)   params.set('date_from', next.date_from)
    if (next.date_to)     params.set('date_to', next.date_to)
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
    setPropertyId(''); setUnitId(''); setMethod(''); setDateFrom(''); setDateTo('')
    router.push(pathname)
  }

  const hasFilters = !!(propertyId || unitId || method || dateFromVal || dateToVal)

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear]

  function isActiveYear(y: number) {
    return dateFromVal === `${y}-01-01` && dateToVal === `${y}-12-31`
  }

  function handleYear(y: number) {
    const from = `${y}-01-01`
    const to   = `${y}-12-31`
    setDateFrom(from)
    setDateTo(to)
    push({ date_from: from, date_to: to })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 pt-3 pb-3.5 mb-6 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {years.map(y => (
          <button key={y} type="button" onClick={() => handleYear(y)}
            className={`px-3.5 py-1 rounded-full text-sm font-medium transition-colors ${
              isActiveYear(y)
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {y}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
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

      <input
        type="date"
        value={dateFromVal}
        onChange={e => { setDateFrom(e.target.value); push({ date_from: e.target.value }) }}
        className={sel}
        placeholder="From"
        title="From date"
      />
      <input
        type="date"
        value={dateToVal}
        onChange={e => { setDateTo(e.target.value); push({ date_to: e.target.value }) }}
        className={sel}
        placeholder="To"
        title="To date"
      />

      {hasFilters && (
        <button onClick={clearAll}
          className="text-sm text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors">
          Clear filters ×
        </button>
      )}
      </div>
    </div>
  )
}
