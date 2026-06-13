import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function TenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select(`
      *,
      lease_tenants(
        is_primary,
        lease:leases(
          id, rent_amount, lease_start, lease_end, renewal_date, status, security_deposit, notes,
          unit:units(id, unit_label, property:properties(id, address, city, state))
        )
      )
    `)
    .eq('id', id)
    .single()

  if (!tenant) notFound()

  const leases = (tenant.lease_tenants ?? [])
    .map((lt: any) => ({ ...lt.lease, is_primary: lt.is_primary }))
    .sort((a: any, b: any) => {
      if (a.status === 'active') return -1
      if (b.status === 'active') return 1
      return new Date(b.lease_start).getTime() - new Date(a.lease_start).getTime()
    })

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    expired: 'bg-slate-100 text-slate-600',
    terminated: 'bg-red-100 text-red-600',
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/tenants" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Tenants
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{tenant.first_name} {tenant.last_name}</h1>
        </div>
        <Link href={`/tenants/${id}/edit`}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors">
          Edit
        </Link>
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {tenant.email && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Email</p>
            <p className="text-sm font-medium text-slate-900">{tenant.email}</p>
          </div>
        )}
        {tenant.phone && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Phone</p>
            <p className="text-sm font-medium text-slate-900">{tenant.phone}</p>
          </div>
        )}
      </div>

      {tenant.notes && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          {tenant.notes}
        </div>
      )}

      {/* Lease history */}
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Lease history</h2>
      {!leases.length ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">
          No leases on record
        </div>
      ) : (
        <div className="space-y-3">
          {leases.map((lease: any) => (
            <div key={lease.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {lease.unit?.property?.address} — {lease.unit?.unit_label}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {new Date(lease.lease_start).toLocaleDateString()}
                    {lease.lease_end ? ` – ${new Date(lease.lease_end).toLocaleDateString()}` : ' – present'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">
                    ${Number(lease.rent_amount).toLocaleString()}/mo
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[lease.status]}`}>
                    {lease.status}
                  </span>
                </div>
              </div>
              {lease.renewal_date && (
                <p className="text-xs text-slate-500 mt-2">
                  Renewal: {new Date(lease.renewal_date).toLocaleDateString()}
                </p>
              )}
              <div className="mt-3">
                <Link
                  href={`/leases/${lease.id}/edit?propertyId=${lease.unit?.property?.id}`}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Manage lease →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
