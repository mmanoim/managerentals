'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addCharge(leaseId: string, formData: FormData) {
  const supabase = await createClient()

  const subtype = formData.get('subtype') as string
  const amount = parseFloat(formData.get('amount') as string)
  const entry_date = formData.get('entry_date') as string
  const description = (formData.get('description') as string) || null

  const { error } = await supabase
    .from('lease_ledger_entries')
    .insert({ lease_id: leaseId, type: 'charge', subtype, description, amount, entry_date })

  if (error) return { error: error.message }

  revalidatePath(`/leases/${leaseId}/edit`)
  redirect(`/leases/${leaseId}/edit`)
}

export async function recordPayment(leaseId: string, formData: FormData) {
  const supabase = await createClient()

  const entry_date = formData.get('entry_date') as string
  const notes = (formData.get('notes') as string) || null
  const methods = formData.getAll('part_method') as string[]
  const amounts = formData.getAll('part_amount') as string[]
  const references = formData.getAll('part_reference') as string[]

  const parts = methods
    .map((method, i) => ({
      method,
      amount: parseFloat(amounts[i]),
      reference: references[i] || null,
    }))
    .filter(p => p.method && !isNaN(p.amount) && p.amount > 0)

  if (parts.length === 0) return { error: 'Please add at least one payment amount' }

  const totalAmount = parts.reduce((s, p) => s + p.amount, 0)

  const { data: entry, error } = await supabase
    .from('lease_ledger_entries')
    .insert({ lease_id: leaseId, type: 'payment', description: notes, amount: totalAmount, entry_date })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const partRows = parts.map(p => ({ ledger_entry_id: entry.id, ...p }))
  const { error: partsError } = await supabase.from('ledger_payment_parts').insert(partRows)
  if (partsError) return { error: partsError.message }

  revalidatePath(`/leases/${leaseId}/edit`)
  redirect(`/leases/${leaseId}/edit`)
}

export async function chargeNextRent(leaseId: string, formData: FormData) {
  const supabase = await createClient()

  const period = formData.get('period') as string
  const amount = parseFloat(formData.get('amount') as string)
  const entry_date = formData.get('entry_date') as string
  const includeLF = formData.get('include_late_fee') === 'on'
  const lfAmount = parseFloat(formData.get('late_fee_amount') as string)

  const [y, m] = period.split('-').map(Number)
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const { error } = await supabase
    .from('lease_ledger_entries')
    .insert({ lease_id: leaseId, type: 'charge', subtype: 'rent', amount, entry_date, description: `Rent — ${monthLabel}` })

  if (error) return { error: error.message }

  if (includeLF && !isNaN(lfAmount) && lfAmount > 0) {
    const { error: lfError } = await supabase
      .from('lease_ledger_entries')
      .insert({ lease_id: leaseId, type: 'charge', subtype: 'late_fee', amount: lfAmount, entry_date, description: 'Late fee' })
    if (lfError) return { error: lfError.message }
  }

  revalidatePath(`/leases/${leaseId}/edit`)
  redirect(`/leases/${leaseId}/edit`)
}

export async function deleteLedgerEntry(entryId: string, leaseId: string) {
  const supabase = await createClient()
  await supabase.from('lease_ledger_entries').delete().eq('id', entryId)
  revalidatePath(`/leases/${leaseId}/edit`)
  redirect(`/leases/${leaseId}/edit`)
}
