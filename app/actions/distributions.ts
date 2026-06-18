'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createDistribution(formData: FormData) {
  const supabase = await createClient()

  const date        = formData.get('date') as string
  const partner     = formData.get('partner') as string
  const source      = (formData.get('source') as string).trim() || null
  const destination = (formData.get('destination') as string).trim() || null
  const amount      = parseFloat(formData.get('amount') as string)
  const notes       = (formData.get('notes') as string).trim() || null

  if (!date || !partner || isNaN(amount) || amount <= 0) {
    return { error: 'Date, partner, and a positive amount are required.' }
  }

  const { error } = await supabase
    .from('distributions')
    .insert({ date, partner, source, destination, amount, notes })

  if (error) return { error: error.message }

  revalidatePath('/distributions')
  redirect('/distributions')
}
