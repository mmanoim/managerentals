import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AddChargeForm from '@/components/AddChargeForm'
import { addCharge } from '@/app/actions/payments'

export default async function AddChargePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string }>
}) {
  const { id } = await params
  const { type } = await searchParams
  const supabase = await createClient()

  const { data: lease } = await supabase
    .from('leases')
    .select('id, rent_amount, late_fee_amount, unit:units(unit_label, property:properties(address))')
    .eq('id', id)
    .single()

  if (!lease) notFound()

  const unit = lease.unit as any
  const property = unit?.property as any
  const action = addCharge.bind(null, id)
  const initialSubtype = (type === 'late_fee' ? 'late_fee' : type === 'adjustment' ? 'adjustment' : 'rent') as any

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
        <h1 className="text-2xl font-bold text-slate-900">Add charge</h1>
        <p className="text-slate-500 mt-0.5">
          {property?.address} — {unit?.unit_label}
        </p>
      </div>
      <AddChargeForm
        action={action}
        defaultRentAmount={Number(lease.rent_amount)}
        defaultLateFee={lease.late_fee_amount ? Number(lease.late_fee_amount) : undefined}
        initialSubtype={initialSubtype}
      />
    </div>
  )
}
