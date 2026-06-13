'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPayment(leaseId: string, formData: FormData) {
  const supabase = await createClient()

  const periodRaw = formData.get('period_month') as string // "2026-07"
  const period_month = `${periodRaw}-01`
  const received_on = formData.get('received_on') as string
  const notes = (formData.get('notes') as string) || null

  const { data: payment, error } = await supabase
    .from('lease_payments')
    .insert({ lease_id: leaseId, period_month, received_on, notes })
    .select('id')
    .single()
  if (error) return { error: error.message }

  const methods = formData.getAll('part_method') as string[]
  const amounts = formData.getAll('part_amount') as string[]
  const references = formData.getAll('part_reference') as string[]

  const parts = methods
    .map((method, i) => ({
      payment_id: payment.id,
      method,
      amount: parseFloat(amounts[i]),
      reference: references[i] || null,
    }))
    .filter(p => p.method && !isNaN(p.amount) && p.amount > 0)

  if (parts.length === 0) {
    await supabase.from('lease_payments').delete().eq('id', payment.id)
    return { error: 'Please add at least one payment amount' }
  }

  const { error: partsError } = await supabase.from('payment_parts').insert(parts)
  if (partsError) return { error: partsError.message }

  revalidatePath(`/leases/${leaseId}/edit`)
  redirect(`/leases/${leaseId}/edit`)
}

export async function deletePayment(paymentId: string, leaseId: string) {
  const supabase = await createClient()
  await supabase.from('lease_payments').delete().eq('id', paymentId)
  revalidatePath(`/leases/${leaseId}/edit`)
  redirect(`/leases/${leaseId}/edit`)
}
