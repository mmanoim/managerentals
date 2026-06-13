'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createProperty(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('properties').insert({
    address: formData.get('address') as string,
    city: (formData.get('city') as string) || null,
    state: (formData.get('state') as string) || null,
    zip: (formData.get('zip') as string) || null,
    purchase_date: (formData.get('purchase_date') as string) || null,
    purchase_price: formData.get('purchase_price') ? Number(formData.get('purchase_price')) : null,
    notes: (formData.get('notes') as string) || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/properties')
  redirect('/properties')
}

export async function updateProperty(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('properties').update({
    address: formData.get('address') as string,
    city: (formData.get('city') as string) || null,
    state: (formData.get('state') as string) || null,
    zip: (formData.get('zip') as string) || null,
    purchase_date: (formData.get('purchase_date') as string) || null,
    purchase_price: formData.get('purchase_price') ? Number(formData.get('purchase_price')) : null,
    notes: (formData.get('notes') as string) || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/properties')
  redirect(`/properties/${id}`)
}

export async function archiveProperty(id: string) {
  const supabase = await createClient()
  await supabase.from('properties').update({ archived: true }).eq('id', id)
  revalidatePath('/properties')
  redirect('/properties')
}

export async function createUnit(propertyId: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('units').insert({
    property_id: propertyId,
    unit_label: formData.get('unit_label') as string,
    monthly_rent: formData.get('monthly_rent') ? Number(formData.get('monthly_rent')) : null,
  })
  if (error) return { error: error.message }
  revalidatePath(`/properties/${propertyId}`)
}

export async function updateUnit(unitId: string, propertyId: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('units').update({
    unit_label: formData.get('unit_label') as string,
    monthly_rent: formData.get('monthly_rent') ? Number(formData.get('monthly_rent')) : null,
  }).eq('id', unitId)
  if (error) return { error: error.message }
  revalidatePath(`/properties/${propertyId}`)
}

export async function archiveUnit(unitId: string, propertyId: string) {
  const supabase = await createClient()
  await supabase.from('units').update({ archived: true }).eq('id', unitId)
  revalidatePath(`/properties/${propertyId}`)
}
