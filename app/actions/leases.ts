'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function leasePayload(formData: FormData) {
  const sd = formData.get('security_deposit') as string
  const sdr = formData.get('security_deposit_returned') as string
  const lf = formData.get('late_fee_amount') as string
  return {
    rent_amount: parseFloat(formData.get('rent_amount') as string),
    late_fee_amount: lf ? parseFloat(lf) : null,
    lease_start: formData.get('lease_start') as string,
    lease_end: (formData.get('lease_end') as string) || null,
    renewal_date: (formData.get('renewal_date') as string) || null,
    status: (formData.get('status') as string) || 'active',
    security_deposit: sd ? parseFloat(sd) : null,
    security_deposit_returned: sdr ? parseFloat(sdr) : null,
    security_deposit_return_date: (formData.get('security_deposit_return_date') as string) || null,
    notes: (formData.get('notes') as string) || null,
  }
}

async function syncTenants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leaseId: string,
  formData: FormData
) {
  await supabase.from('lease_tenants').delete().eq('lease_id', leaseId)
  const primary = formData.get('primary_tenant_id') as string
  const tenantIds = formData.getAll('tenant_ids') as string[]
  const rows: { lease_id: string; tenant_id: string; is_primary: boolean }[] = []

  if (tenantIds.length > 0) {
    for (const tid of tenantIds) {
      rows.push({ lease_id: leaseId, tenant_id: tid, is_primary: tid === primary })
    }
  } else if (primary) {
    rows.push({ lease_id: leaseId, tenant_id: primary, is_primary: true })
    const co = formData.get('co_tenant_id') as string
    if (co && co !== primary) rows.push({ lease_id: leaseId, tenant_id: co, is_primary: false })
  }

  if (rows.length) await supabase.from('lease_tenants').insert(rows)
}

export async function createLeaseStandalone(formData: FormData) {
  const supabase = await createClient()
  const unitId = formData.get('unit_id') as string
  if (!unitId) return { error: 'Please select a unit' }

  const { data: unit } = await supabase
    .from('units')
    .select('property_id')
    .eq('id', unitId)
    .single()

  const { data: lease, error } = await supabase
    .from('leases')
    .insert({ unit_id: unitId, ...leasePayload(formData) })
    .select('id')
    .single()
  if (error) return { error: error.message }

  await syncTenants(supabase, lease.id, formData)
  revalidatePath('/leases')
  if (unit?.property_id) revalidatePath(`/properties/${unit.property_id}`)
  redirect('/leases')
}

export async function updateLease(leaseId: string, propertyId: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('leases')
    .update(leasePayload(formData))
    .eq('id', leaseId)
  if (error) return { error: error.message }
  await syncTenants(supabase, leaseId, formData)
  revalidatePath(`/properties/${propertyId}`)
  revalidatePath('/leases')
  redirect('/leases')
}
