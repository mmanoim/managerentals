import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import NextRentChargeForm from '@/components/NextRentChargeForm'
import { chargeNextRent } from '@/app/actions/payments'

function nextMonthAfter(dateStr: string): string {
  const [y, m] = dateStr.slice(0, 7).split('-').map(Number)
  const next = new Date(y, m) // m is already 1-based so new Date(y, m) gives next month
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function NextRentChargePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: lease }, { data: lastCharge }] = await Promise.all([
    supabase
      .from('leases')
      .select('id, rent_amount, late_fee_amount, unit:units(unit_label, property:properties(address))')
      .eq('id', id)
      .single(),
    supabase
      .from('lease_ledger_entries')
      .select('entry_date')
      .eq('lease_id', id)
      .eq('type', 'charge')
      .eq('subtype', 'rent')
      .order('entry_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!lease) notFound()

  const nextPeriod = lastCharge?.entry_date
    ? nextMonthAfter(lastCharge.entry_date)
    : currentMonth()

  const unit = (lease.unit as any)
  const property = unit?.property

  const action = chargeNextRent.bind(null, id)

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Link href={`/leases/${id}/edit`}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to lease
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Charge next rent</h1>
        <p className="text-slate-500 mt-0.5">
          {property?.address} — {unit?.unit_label}
        </p>
      </div>
      <NextRentChargeForm
        action={action}
        nextPeriod={nextPeriod}
        rentAmount={Number(lease.rent_amount)}
        lateFeeAmount={lease.late_fee_amount ? Number(lease.late_fee_amount) : undefined}
      />
    </div>
  )
}
