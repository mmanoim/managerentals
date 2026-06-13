import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import LeaseForm from '@/components/LeaseForm'
import { updateLease } from '@/app/actions/leases'

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

  const [{ data: lease }, { data: tenants }] = await Promise.all([
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
    </div>
  )
}
