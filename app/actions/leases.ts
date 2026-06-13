'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function leasePayload(formData: FormData) {
  const sd = formData.get('security_deposit') as string
  const sdr = formData.get('security_deposit_returned') as string
  return {
    rent_amount: parseFloat(formData.get('rent_amount') as string),
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
  const rows: { lease_id: string; tenant_id: string; is_primary: boolean }[] = []
  const primary = formData.get('primary_tenant_id') as string
  if (primary) rows.push({ lease_id: leaseId, tenant_id: primary, is_primary: true })
  const co = formData.get('co_tenant_id') as string
  if (co && co !== primary) rows.push({ lease_id: leaseId, tenant_id: co, is_primary: false })
  if (rows.length) await supabase.from('lease_tenants').insert(rows)
}

export async function createLease(unitId: string, propertyId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: lease, error } = await supabase
    .from('leases')
    .insert({ unit_id: unitId, ...leasePayload(formData) })
    .select('id')
    .single()
  if (error) return { error: error.message }
  await syncTenants(supabase, lease.id, formData)
  revalidatePath(`/properties/${propertyId}`)
  redirect(`/properties/${propertyId}`)
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
  redirect(`/properties/${propertyId}`)
}
