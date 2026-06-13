import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TenantsPage() {
  const supabase = await createClient()

  const { data: tenants } = await supabase
    .from('tenants')
    .select(`
      id, first_name, last_name, email, phone,
      lease_tenants(
        is_primary,
        lease:leases(
          status, lease_start, renewal_date,
          unit:units(unit_label, property:properties(address))
        )
      )
    `)
    .eq('archived', false)
    .order('last_name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
          <p className="text-slate-500 mt-0.5">{tenants?.length ?? 0} tenants</p>
        </div>
        <Link href="/tenants/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm flex items-center gap-2">
          <span className="text-lg leading-none">+</span> Add tenant
        </Link>
      </div>

      {!tenants?.length ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="font-medium text-slate-900 mb-1">No tenants yet</p>
          <p className="text-sm text-slate-500 mb-4">Add your first tenant to get started</p>
          <Link href="/tenants/new" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Add a tenant →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Contact</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Current unit</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Renewal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map(tenant => {
                const activeLt = tenant.lease_tenants?.find(
                  lt => (lt.lease as any)?.status === 'active'
                )
                const activeLease = activeLt?.lease as any
                return (
                  <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/tenants/${tenant.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                        {tenant.last_name}, {tenant.first_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {tenant.email && <p>{tenant.email}</p>}
                      {tenant.phone && <p>{tenant.phone}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {activeLease ? (
                        <span>
                          {activeLease.unit?.property?.address} — {activeLease.unit?.unit_label}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No active lease</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {activeLease?.renewal_date
                        ? new Date(activeLease.renewal_date).toLocaleDateString()
                        : '—'}
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
