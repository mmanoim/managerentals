import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import LeaseForm from '@/components/LeaseForm'
import { updateLease } from '@/app/actions/leases'
import { deletePayment } from '@/app/actions/payments'

const METHOD_LABELS: Record<string, string> = {
  check: 'Check',
  cash: 'Cash',
  cashapp: 'Cash App',
  zelle: 'Zelle',
  venmo: 'Venmo',
}

const METHOD_COLORS: Record<string, string> = {
  check: 'bg-blue-100 text-blue-700',
  cash: 'bg-green-100 text-green-700',
  cashapp: 'bg-lime-100 text-lime-700',
  zelle: 'bg-purple-100 text-purple-700',
  venmo: 'bg-sky-100 text-sky-700',
}

function formatPeriod(dateStr: string) {
  const [year, month] = dateStr.split('-')
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December']
  return `${months[parseInt(month) - 1]} ${year}`
}

function fmt(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default async function EditLeasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ propertyId?: string }>
}) {
  const { id } = await params
  const { propertyId } = await searchParams
  const supabase = await createClient()

  const [{ data: lease }, { data: tenants }, { data: payments }] = await Promise.all([
    supabase
      .from('leases')
      .select(`
        *,
        unit:units(id, unit_label, property:properties(id, address)),
        lease_tenants(is_primary, tenant:tenants(id, first_name, last_name))
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('tenants')
      .select('id, first_name, last_name')
      .eq('archived', false)
      .order('last_name'),
    supabase
      .from('lease_payments')
      .select('id, period_month, received_on, notes, payment_parts(method, amount, reference)')
      .eq('lease_id', id)
      .order('period_month', { ascending: false }),
  ])

  if (!lease) notFound()

  const unit = lease.unit as any
  const resolvedPropertyId = propertyId ?? unit?.property?.id
  const leaseTenants = (lease.lease_tenants as any[]) ?? []

  const action = updateLease.bind(null, id, resolvedPropertyId)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/leases" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Leases
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-3">Edit lease</h1>
        <p className="text-slate-500 mt-0.5">{unit?.property?.address} — {unit?.unit_label}</p>
      </div>

      <LeaseForm
        action={action}
        tenants={tenants ?? []}
        unitLabel={unit?.unit_label ?? ''}
        isEdit
        defaultValues={{
          lease_tenants: leaseTenants.map((lt: any) => ({
            id: lt.tenant.id,
            first_name: lt.tenant.first_name,
            last_name: lt.tenant.last_name,
            is_primary: lt.is_primary,
          })),
          rent_amount: lease.rent_amount,
          late_fee_amount: lease.late_fee_amount ?? undefined,
          lease_start: lease.lease_start,
          lease_end: lease.lease_end ?? undefined,
          renewal_date: lease.renewal_date ?? undefined,
          status: lease.status,
          security_deposit: lease.security_deposit ?? undefined,
          security_deposit_returned: lease.security_deposit_returned ?? undefined,
          security_deposit_return_date: lease.security_deposit_return_date ?? undefined,
          notes: lease.notes ?? undefined,
        }}
      />

      {/* Payment history */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Payments
            {payments?.length ? (
              <span className="ml-2 text-sm font-normal text-slate-400">{payments.length} recorded</span>
            ) : null}
          </h2>
          <Link
            href={`/leases/${id}/payments/new`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 hover:border-indigo-300 transition-colors"
          >
            + Record payment
          </Link>
        </div>

        {!payments?.length ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400">
            No payments recorded yet
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Period</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Received</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Breakdown</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Total</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(payments as any[]).map((payment) => {
                  const parts = (payment.payment_parts as any[]) ?? []
                  const total = parts.reduce((s: number, p: any) => s + Number(p.amount), 0)
                  const diff = total - Number(lease.rent_amount)
                  const deleteAction = deletePayment.bind(null, payment.id, id)
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-slate-900">
                        {formatPeriod(payment.period_month)}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        {fmt(payment.received_on)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {parts.map((p: any, i: number) => (
                            <span key={i} className={`text-xs font-medium px-2 py-0.5 rounded-full ${METHOD_COLORS[p.method] ?? 'bg-slate-100 text-slate-600'}`}>
                              {METHOD_LABELS[p.method] ?? p.method} ${Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              {p.reference ? ` · ${p.reference}` : ''}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`text-sm font-semibold ${
                          diff === 0 ? 'text-green-600' : diff < 0 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <form action={deleteAction}>
                          <button type="submit"
                            className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium"
                            onClick={(e) => { if (!confirm('Delete this payment record?')) e.preventDefault() }}>
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
