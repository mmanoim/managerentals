import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const METHOD_LABELS: Record<string, string> = {
  td_business: 'TD Business', cash: 'Cash', cashapp: 'Cash App', zelle: 'Zelle', venmo: 'Venmo',
}
const METHOD_COLORS: Record<string, string> = {
  td_business: 'bg-blue-100 text-blue-700',
  cash:    'bg-green-100 text-green-700',
  cashapp: 'bg-lime-100 text-lime-700',
  zelle:   'bg-purple-100 text-purple-700',
  venmo:   'bg-sky-100 text-sky-700',
}
const SUBTYPE_LABELS: Record<string, string> = {
  rent: 'Rent', late_fee: 'Late fee', adjustment: 'Adjustment',
}

function fmt(d: string) {
  const [y, m, day] = d.split('-')
  return new Date(Number(y), Number(m) - 1, Number(day))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDate(d: string | null) {
  if (!d) return 'present'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function fmtMoney(n: number) {
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2 })
}

export default async function TenantBalancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select(`
      id, first_name, last_name,
      lease_tenants(
        lease:leases(
          id, rent_amount, lease_start, lease_end, status,
          unit:units(unit_label, property:properties(id, address))
        )
      )
    `)
    .eq('id', id)
    .single()

  if (!tenant) notFound()

  const leases = (tenant.lease_tenants ?? [])
    .map((lt: any) => lt.lease)
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(a.lease_start).getTime() - new Date(b.lease_start).getTime())

  const leaseIds = leases.map((l: any) => l.id)

  const { data: rawEntries } = leaseIds.length
    ? await supabase
        .from('lease_ledger_entries')
        .select('id, type, subtype, description, amount, entry_date, lease_id, ledger_payment_parts(method, amount, reference)')
        .in('lease_id', leaseIds)
        .order('entry_date', { ascending: true })
        .order('created_at', { ascending: true })
    : { data: [] }

  const entriesByLease: Record<string, any[]> = {}
  for (const entry of rawEntries ?? []) {
    if (!entriesByLease[entry.lease_id]) entriesByLease[entry.lease_id] = []
    entriesByLease[entry.lease_id].push(entry)
  }

  // Build ledger per lease with running balance
  const leaseData = leases.map((lease: any) => {
    let running = 0
    const entries = (entriesByLease[lease.id] ?? []).map((e: any) => {
      running += e.type === 'charge' ? Number(e.amount) : -Number(e.amount)
      return { ...e, runningBalance: running }
    })
    return { lease, entries, balance: running }
  })

  const totalBalance = leaseData.reduce((s, d) => s + d.balance, 0)
  const totalCharged = (rawEntries ?? []).filter((e: any) => e.type === 'charge').reduce((s, e: any) => s + Number(e.amount), 0)
  const totalPaid = (rawEntries ?? []).filter((e: any) => e.type === 'payment').reduce((s, e: any) => s + Number(e.amount), 0)

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/tenants/${id}`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {tenant.first_name} {tenant.last_name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Balance &amp; Payments</h1>
        <p className="text-slate-500 mt-0.5">{tenant.first_name} {tenant.last_name}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total charged</p>
          <p className="text-xl font-bold text-slate-900">{fmtMoney(totalCharged)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total paid</p>
          <p className="text-xl font-bold text-green-600">{fmtMoney(totalPaid)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Balance due</p>
          <p className={`text-xl font-bold ${totalBalance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmtMoney(totalBalance)}
            {totalBalance < 0 && <span className="text-sm font-normal text-green-500 ml-1">credit</span>}
          </p>
        </div>
      </div>

      {/* Per-lease ledgers */}
      {leaseData.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-400">
          No leases on record
        </div>
      ) : (
        <div className="space-y-8">
          {leaseData.map(({ lease, entries, balance }) => {
            const unit = lease.unit as any
            const property = unit?.property as any
            return (
              <div key={lease.id}>
                {/* Lease header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {property?.address} — {unit?.unit_label}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {fmtDate(lease.lease_start)} – {fmtDate(lease.lease_end)} · ${Number(lease.rent_amount).toLocaleString()}/mo
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Balance</p>
                    <p className={`text-base font-bold ${balance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtMoney(balance)}
                      {balance < 0 && <span className="text-xs font-normal text-green-500 ml-1">cr</span>}
                    </p>
                  </div>
                </div>

                {entries.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-400">
                    No transactions yet
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Date</th>
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Description</th>
                          <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Charge</th>
                          <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Payment</th>
                          <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {entries.map((entry: any) => {
                          const isCharge = entry.type === 'charge'
                          const parts = (entry.ledger_payment_parts ?? []) as any[]
                          return (
                            <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                {fmt(entry.entry_date)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-slate-900 font-medium">
                                  {entry.description ||
                                    (isCharge ? SUBTYPE_LABELS[entry.subtype] ?? 'Charge' : 'Payment received')}
                                </span>
                                {!isCharge && parts.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {parts.map((p: any, i: number) => (
                                      <span key={i} className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${METHOD_COLORS[p.method] ?? 'bg-slate-100 text-slate-600'}`}>
                                        {METHOD_LABELS[p.method] ?? p.method} ${Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        {p.reference ? ` · ${p.reference}` : ''}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-red-600">
                                {isCharge ? fmtMoney(Number(entry.amount)) : ''}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-green-600">
                                {!isCharge ? fmtMoney(Number(entry.amount)) : ''}
                              </td>
                              <td className={`px-4 py-3 text-right font-bold ${entry.runningBalance <= 0 ? 'text-green-600' : 'text-slate-900'}`}>
                                {fmtMoney(entry.runningBalance)}
                                {entry.runningBalance < 0 && <span className="text-xs font-normal text-green-500 ml-1">cr</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
