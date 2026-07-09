'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPolicy(propertyId: string, formData: FormData) {
  const supabase = await createClient()
  const isActive = formData.get('is_active') === 'on'

  if (isActive) {
    await supabase
      .from('property_insurance_policies')
      .update({ is_active: false })
      .eq('property_id', propertyId)
  }

  const { error } = await supabase.from('property_insurance_policies').insert({
    property_id: propertyId,
    company: (formData.get('company') as string).trim(),
    policy_number: (formData.get('policy_number') as string)?.trim() || null,
    premium: formData.get('premium') ? Number(formData.get('premium')) : null,
    effective_date: formData.get('effective_date') as string,
    expiration_date: formData.get('expiration_date') as string,
    notes: (formData.get('notes') as string)?.trim() || null,
    is_active: isActive,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/insurance/${propertyId}`)
  revalidatePath('/insurance')
  redirect(`/insurance/${propertyId}`)
}

export async function updatePolicy(policyId: string, propertyId: string, formData: FormData) {
  const supabase = await createClient()
  const isActive = formData.get('is_active') === 'on'

  if (isActive) {
    await supabase
      .from('property_insurance_policies')
      .update({ is_active: false })
      .eq('property_id', propertyId)
      .neq('id', policyId)
  }

  const { error } = await supabase.from('property_insurance_policies').update({
    company: (formData.get('company') as string).trim(),
    policy_number: (formData.get('policy_number') as string)?.trim() || null,
    premium: formData.get('premium') ? Number(formData.get('premium')) : null,
    effective_date: formData.get('effective_date') as string,
    expiration_date: formData.get('expiration_date') as string,
    notes: (formData.get('notes') as string)?.trim() || null,
    is_active: isActive,
  }).eq('id', policyId)

  if (error) throw new Error(error.message)
  revalidatePath(`/insurance/${propertyId}`)
  revalidatePath('/insurance')
  redirect(`/insurance/${propertyId}`)
}

export async function deletePolicy(policyId: string, propertyId: string) {
  const supabase = await createClient()
  await supabase.from('property_insurance_policies').delete().eq('id', policyId)
  revalidatePath(`/insurance/${propertyId}`)
  revalidatePath('/insurance')
  redirect(`/insurance/${propertyId}`)
}
