import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return new Date(Number(y), Number(m) - 1, Number(day))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(dateStr + 'T00:00:00')
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default async function InsurancePage() {
  const supabase = await createClient()

  const [{ data: properties }, { data: policies }] = await Promise.all([
    supabase.from('properties').select('id, address').eq('archived', false).order('address'),
    supabase
      .from('property_insurance_policies')
      .select('*')
      .order('effective_date', { ascending: false }),
  ])

  const policiesByProperty: Record<string, any[]> = {}
  for (const policy of policies ?? []) {
    if (!policiesByProperty[policy.property_id]) policiesByProperty[policy.property_id] = []
    policiesByProperty[policy.property_id].push(policy)
  }

  const expiringSoon = (policies ?? [])
    .filter(p => {
      const days = daysUntil(p.expiration_date)
      return days >= 0 && days <= 60
    })
    .sort((a, b) => daysUntil(a.expiration_date) - daysUntil(b.expiration_date))

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Insurance</h1>
          <p className="text-slate-500 mt-0.5">Property insurance policies</p>
        </div>
      </div>

      {expiringSoon.length > 0 && (
        <div className="mb-6 space-y-2">
          {expiringSoon.map(p => {
            const days = daysUntil(p.expiration_date)
            const isUrgent = days <= 30
            const property = (properties ?? []).find(prop => prop.id === p.property_id)
            return (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                isUrgent
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <svg className={`w-4 h-4 flex-shrink-0 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-medium">
                  <strong>{property?.address}</strong> — {p.company} expires in{' '}
                  <strong>{days} day{days !== 1 ? 's' : ''}</strong> ({fmtDate(p.expiration_date)})
                </span>
                <Link
                  href={`/insurance/${p.property_id}`}
                  className="ml-auto text-xs font-medium underline underline-offset-2 flex-shrink-0"
                >
                  Manage →
                </Link>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Property</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Active policy</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Period</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Annual premium</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(properties ?? []).map(property => {
              const propPolicies = policiesByProperty[property.id] ?? []
              const activePolicy = propPolicies.find(p => p.is_active) ?? propPolicies[0] ?? null
              const days = activePolicy ? daysUntil(activePolicy.expiration_date) : null

              return (
                <tr key={property.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-slate-900">{property.address}</td>
                  <td className="px-5 py-4">
                    {activePolicy ? (
                      <div>
                        <div className="font-medium text-slate-900">{activePolicy.company}</div>
                        {activePolicy.policy_number && (
                          <div className="text-xs text-slate-400 mt-0.5">#{activePolicy.policy_number}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-xs">No policy</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                    {activePolicy
                      ? `${fmtDate(activePolicy.effective_date)} – ${fmtDate(activePolicy.expiration_date)}`
                      : '—'}
                  </td>
                  <td className="px-5 py-4 text-right font-medium text-slate-700">
                    {activePolicy?.premium
                      ? `$${Number(activePolicy.premium).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td className="px-4 py-4">
                    {days === null ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : days < 0 ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Expired</span>
                    ) : days <= 30 ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">{days}d left</span>
                    ) : days <= 60 ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{days}d left</span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/insurance/${property.id}`}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {propPolicies.length > 0 ? 'Manage →' : 'Add policy →'}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
