import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import LeaseForm from '@/components/LeaseForm'
import { createLease } from '@/app/actions/leases'

export default async function NewLeasePage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>
}) {
  const { id: propertyId, unitId } = await params
  const supabase = await createClient()

  const [{ data: unit }, { data: tenants }] = await Promise.all([
    supabase
      .from('units')
      .select('id, unit_label, monthly_rent, property:properties(address)')
      .eq('id', unitId)
      .single(),
    supabase
      .from('tenants')
      .select('id, first_name, last_name')
      .eq('archived', false)
      .order('last_name'),
  ])

  if (!unit) notFound()

  const action = createLease.bind(null, unitId, propertyId)
  const property = unit.property as any

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/properties/${propertyId}`}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to property
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-3">New lease</h1>
        <p className="text-slate-500 mt-0.5">{property?.address} — {unit.unit_label}</p>
      </div>
      <LeaseForm
        action={action}
        tenants={tenants ?? []}
        unitLabel={unit.unit_label}
        defaultValues={{ rent_amount: unit.monthly_rent ?? undefined }}
      />
    </div>
  )
}
