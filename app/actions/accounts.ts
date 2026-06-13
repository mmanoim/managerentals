'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function accountPayload(formData: FormData) {
  return {
    name: formData.get('name') as string,
    type: formData.get('type') as 'bank' | 'payapp' | 'cash' | 'credit',
    institution: (formData.get('institution') as string) || null,
    last_four: (formData.get('last_four') as string) || null,
    owner: (formData.get('owner') as string || 'joint') as 'joint' | 'marina' | 'jacob',
    opening_balance: formData.get('opening_balance') ? Number(formData.get('opening_balance')) : 0,
  }
}

export async function createAccount(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('accounts').insert(accountPayload(formData))
  if (error) return { error: error.message }
  revalidatePath('/accounts')
  redirect('/accounts')
}

export async function updateAccount(id: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('accounts').update(accountPayload(formData)).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/accounts')
  redirect('/accounts')
}

export async function toggleAccountActive(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const currentActive = formData.get('current_active') === 'true'
  await supabase.from('accounts').update({ is_active: !currentActive }).eq('id', id)
  revalidatePath('/accounts')
}
