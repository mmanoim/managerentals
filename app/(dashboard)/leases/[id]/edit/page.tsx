import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import LeaseForm from '@/components/LeaseForm'
import DeleteEntryButton from '@/components/DeleteEntryButton'
import { updateLease } from '@/app/actions/leases'
import { deleteLedgerEntry } from '@/app/actions/payments'

const METHOD_LABELS: Record<string, string> = {
  td_business: 'TD Business', cash: 'Cash', cashapp: 'Cash App', zelle: 'Zelle', venmo: 'Venmo',
}
const METHOD_COLORS: Record<string, string> = {
  td_business: 'bg-blue-100 text-blue-700',
  cash:        'bg-green-100 text-green-700',
  cashapp:     'bg-lime-100 text-lime-700',
  zelle:       'bg-purple-100 text-purple-700',
  venmo:       'bg-sky-100 text-sky-700',
}
const SUBTYPE_LABELS: Record<string, string> = {
  rent: 'Rent', late_fee: 'Late fee', adjustment: 'Adjustment',
}

function fmt(d: string) {
  const [y, m, day] = d.split('-')
  return new Date(Number(y), Number(m) - 1, Number(day))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

  const [{ data: lease }, { data: tenants }, { data: rawEntries }] = await Promise.all([
    supabase
      .from('leases')
      .select(`*, unit:units(id, unit_label, property:properties(id, address)), lease_tenants(is_primary, tenant:tenants(id, first_name, last_name))`)
      .eq('id', id)
      .single(),
    supabase
      .from('tenants')
      .select('id, first_name, last_name')
      .eq('archived', false)
      .order('last_name'),
    supabase
      .from('lease_ledger_entries')
      .select('id, type, subtype, description, amount, entry_date, created_at, ledger_payment_parts(method, amount, reference)')
      .eq('lease_id', id)
      .order('entry_date', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  if (!lease) notFound()

  const unit = lease.unit as any
  const resolvedPropertyId = propertyId ?? unit?.property?.id
  const leaseTenants = (lease.lease_tenants as any[]) ?? []
  const action = updateLease.bind(null, id, resolvedPropertyId)

  // Build ledger with running balance
  let runningBalance = 0
  const ledger = (rawEntries ?? []).map((e: any) => {
    const delta = e.type === 'charge' ? Number(e.amount) : -Number(e.amount)
    runningBalance += delta
    return { ...e, runningBalance }
  })
  const currentBalance = runningBalance

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

      {/* Ledger */}
      <div className="mb-10">
        {/* Header: balance + actions */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Ledger</h2>
            {ledger.length > 0 && (
              <div className="mt-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Balance due </span>
                <span className={`text-xl font-bold ${
                  currentBalance <= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${Math.abs(currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                {currentBalance < 0 && (
                  <span className="ml-1.5 text-xs text-green-500 font-medium">credit</span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href={`/leases/${id}/charges/next-rent`}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors">
              + Charge next rent
            </Link>
            <Link href={`/leases/${id}/payments/new`}
              className="text-xs font-medium text-white px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors">
              Record payment
            </Link>
          </div>
        </div>

        {ledger.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400">
            No ledger entries yet — start by adding a rent charge
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Description</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Charge</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Payment</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Balance</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.map((entry: any) => {
                  const isCharge = entry.type === 'charge'
                  const parts = (entry.ledger_payment_parts ?? []) as any[]
                  const deleteAction = deleteLedgerEntry.bind(null, entry.id, id)
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                        {fmt(entry.entry_date)}
                      </td>
                      <td className="px-5 py-3">
                        <div>
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
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">
                        {isCharge ? `$${Number(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">
                        {!isCharge ? `$${Number(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
                      </td>
                      <td className={`px-5 py-3 text-right font-bold ${
                        entry.runningBalance <= 0 ? 'text-green-600' : 'text-slate-900'
                      }`}>
                        ${Math.abs(entry.runningBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        {entry.runningBalance < 0 && <span className="text-xs font-normal text-green-500 ml-1">cr</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteEntryButton action={deleteAction} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
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
    </div>
  )
}
