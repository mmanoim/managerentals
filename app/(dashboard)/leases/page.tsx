import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import LeasesFilter from '@/components/LeasesFilter'

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  expired: 'bg-slate-100 text-slate-500',
  terminated: 'bg-red-100 text-red-600',
}

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ showAll?: string }>
}) {
  const { showAll } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('leases')
    .select(`
      id, rent_amount, lease_start, lease_end, renewal_date, status,
      unit:units(unit_label, property:properties(id, address, city, state)),
      lease_tenants(is_primary, tenant:tenants(first_name, last_name))
    `)
    .order('renewal_date', { ascending: true })

  if (!showAll) {
    query = query.eq('status', 'active')
  } else {
    query = query.order('status', { ascending: true })
  }

  const { data: leases } = await query

  function tenantName(lease: any) {
    const sorted = [...(lease.lease_tenants ?? [])].sort(
      (a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)
    )
    return sorted.map((lt: any) => `${lt.tenant.first_name} ${lt.tenant.last_name}`).join(' & ')
  }

  function fmt(date: string | null) {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leases</h1>
          <p className="text-slate-500 mt-0.5">
            {leases?.length ?? 0} {showAll ? 'total' : 'active'}
          </p>
        </div>
        <Link
          href="/leases/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          + New lease
        </Link>
      </div>

      <Suspense>
        <LeasesFilter showAll={!!showAll} />
      </Suspense>

      {!leases?.length ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-500">
          No leases found
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Tenant</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Property</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Unit</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Rent/mo</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Lease end</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Renewal</th>
                {showAll && (
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Status</th>
                )}
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leases.map((lease: any) => {
                const unit = lease.unit as any
                const property = unit?.property as any
                return (
                  <tr key={lease.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 text-sm">
                      {tenantName(lease)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <Link href={`/properties/${property?.id}`} className="hover:text-indigo-600">
                        {property?.address}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {unit?.unit_label}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium text-right">
                      ${Number(lease.rent_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {fmt(lease.lease_end)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {lease.renewal_date ? (
                        <span className={
                          new Date(lease.renewal_date) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                            ? 'text-amber-600 font-medium'
                            : 'text-slate-600'
                        }>
                          {fmt(lease.renewal_date)}
                        </span>
                      ) : '—'}
                    </td>
                    {showAll && (
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[lease.status]}`}>
                          {lease.status}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/leases/${lease.id}/edit?propertyId=${property?.id}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Manage
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
