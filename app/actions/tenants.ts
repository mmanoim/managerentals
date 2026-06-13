'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTenant(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('tenants').insert({
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    email: (formData.get('email') as string) || null,
    phone: (formData.get('phone') as string) || null,
    notes: (formData.get('notes') as string) || null,
  })
  if (error) return { error: error.message }
  revalidatePath('/tenants')
  redirect('/tenants')
}

export async function updateTenant(id: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('tenants').update({
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    email: (formData.get('email') as string) || null,
    phone: (formData.get('phone') as string) || null,
    notes: (formData.get('notes') as string) || null,
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/tenants')
  revalidatePath(`/tenants/${id}`)
  redirect(`/tenants/${id}`)
}

export async function archiveTenant(id: string) {
  const supabase = await createClient()
  await supabase.from('tenants').update({ archived: true }).eq('id', id)
  revalidatePath('/tenants')
  redirect('/tenants')
}
