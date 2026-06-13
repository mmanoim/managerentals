import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RecordPaymentForm from '@/components/RecordPaymentForm'
import { createPayment } from '@/app/actions/payments'

export default async function RecordPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lease } = await supabase
    .from('leases')
    .select(`
      id, rent_amount,
      unit:units(unit_label, property:properties(address))
    `)
    .eq('id', id)
    .single()

  if (!lease) notFound()

  const unit = lease.unit as any
  const property = unit?.property as any
  const action = createPayment.bind(null, id)

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
        <h1 className="text-2xl font-bold text-slate-900">Record payment</h1>
        <p className="text-slate-500 mt-0.5">
          {property?.address} — {unit?.unit_label} · ${Number(lease.rent_amount).toLocaleString()}/mo
        </p>
      </div>
      <RecordPaymentForm action={action} rentAmount={Number(lease.rent_amount)} />
    </div>
  )
}
