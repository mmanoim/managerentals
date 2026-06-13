'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function payload(formData: FormData) {
  return {
    code: (formData.get('code') as string).trim(),
    name: (formData.get('name') as string).trim(),
    type: formData.get('type') as string,
  }
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('chart_of_accounts').insert(payload(formData))
  if (error) return { error: error.message }
  revalidatePath('/categories')
  redirect('/categories')
}

export async function updateCategory(id: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('chart_of_accounts')
    .update(payload(formData))
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/categories')
  redirect('/categories')
}

export async function archiveCategory(id: string, archived: boolean) {
  const supabase = await createClient()
  await supabase.from('chart_of_accounts').update({ archived }).eq('id', id)
  revalidatePath('/categories')
}
