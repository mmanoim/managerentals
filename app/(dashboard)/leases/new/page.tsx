import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import NewLeaseForm from '@/components/NewLeaseForm'
import { createLeaseStandalone } from '@/app/actions/leases'

export default async function NewLeasePage({
  searchParams,
}: {
  searchParams: Promise<{ unitId?: string; propertyId?: string }>
}) {
  const { unitId, propertyId } = await searchParams
  const supabase = await createClient()

  const [{ data: tenants }, { data: properties }, { data: units }] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, first_name, last_name')
      .eq('archived', false)
      .order('last_name'),
    supabase
      .from('properties')
      .select('id, address, city')
      .eq('archived', false)
      .order('address'),
    supabase
      .from('units')
      .select('id, unit_label, property_id, monthly_rent')
      .eq('archived', false)
      .order('unit_label'),
  ])

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/leases" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Leases
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New lease</h1>
        <p className="text-slate-500 mt-0.5">Add tenants, select a unit, then fill in the lease terms</p>
      </div>
      <NewLeaseForm
        action={createLeaseStandalone}
        tenants={tenants ?? []}
        properties={properties ?? []}
        units={units ?? []}
        defaultUnitId={unitId}
        defaultPropertyId={propertyId}
      />
    </div>
  )
}
