import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import PaymentsFilter from '@/components/PaymentsFilter'

const METHOD_LABELS: Record<string, string> = {
  check: 'Check', cash: 'Cash', cashapp: 'Cash App', zelle: 'Zelle', venmo: 'Venmo',
}
const METHOD_COLORS: Record<string, string> = {
  check:   'bg-blue-100 text-blue-700',
  cash:    'bg-green-100 text-green-700',
  cashapp: 'bg-lime-100 text-lime-700',
  zelle:   'bg-purple-100 text-purple-700',
  venmo:   'bg-sky-100 text-sky-700',
}

function fmt(d: string) {
  const [y, m, day] = d.split('-')
  return new Date(Number(y), Number(m) - 1, Number(day))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function primaryTenantName(leaseTenants: any[]) {
  const sorted = [...leaseTenants].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
  return sorted.map(lt => `${lt.tenant.first_name} ${lt.tenant.last_name}`).join(' & ')
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; unitId?: string; method?: string }>
}) {
  const { propertyId, unitId, method } = await searchParams
  const supabase = await createClient()

  const [{ data: entries }, { data: properties }, { data: units }] = await Promise.all([
    supabase
      .from('lease_ledger_entries')
      .select(`
        id, entry_date, amount, description, created_at,
        lease:leases(
          id, rent_amount,
          unit:units(id, unit_label, property_id, property:properties(id, address, city)),
          lease_tenants(is_primary, tenant:tenants(first_name, last_name))
        ),
        ledger_payment_parts(method, amount, reference)
      `)
      .eq('type', 'payment')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('properties')
      .select('id, address')
      .eq('archived', false)
      .order('address'),
    supabase
      .from('units')
      .select('id, unit_label, property_id')
      .eq('archived', false)
      .order('unit_label'),
  ])

  // Apply filters
  let filtered = (entries ?? []) as any[]

  if (propertyId) {
    filtered = filtered.filter(e => (e.lease?.unit as any)?.property?.id === propertyId)
  }
  if (unitId) {
    filtered = filtered.filter(e => (e.lease?.unit as any)?.id === unitId)
  }
  if (method) {
    filtered = filtered.filter(e =>
      (e.ledger_payment_parts as any[])?.some((p: any) => p.method === method)
    )
  }

  const totalAmount = filtered.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-500 mt-0.5">
            {filtered.length} payment{filtered.length !== 1 ? 's' : ''}
            {filtered.length > 0 && (
              <> · <span className="font-medium text-slate-700">
                ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} total
              </span></>
            )}
            {(propertyId || unitId || method) && ' (filtered)'}
          </p>
        </div>
      </div>

      <Suspense>
        <PaymentsFilter
          properties={properties ?? []}
          units={units ?? []}
        />
      </Suspense>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-400">
          No payments found
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Tenant</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Property · Unit</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Methods</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((entry: any) => {
                const lease = entry.lease as any
                const unit = lease?.unit as any
                const property = unit?.property as any
                const parts = (entry.ledger_payment_parts as any[]) ?? []
                const leaseTenants = (lease?.lease_tenants as any[]) ?? []
                return (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      {fmt(entry.entry_date)}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {primaryTenantName(leaseTenants) || '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      <span className="font-medium">{property?.address}</span>
                      {unit?.unit_label && (
                        <span className="text-slate-400"> · {unit.unit_label}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {parts.map((p: any, i: number) => (
                          <span key={i}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${METHOD_COLORS[p.method] ?? 'bg-slate-100 text-slate-600'}`}>
                            {METHOD_LABELS[p.method] ?? p.method}
                            {' '}${Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            {p.reference ? ` · ${p.reference}` : ''}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">
                      ${Number(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/leases/${lease?.id}/edit`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                        Lease →
                      </Link>
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
}
