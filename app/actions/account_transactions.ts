'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function txPayload(formData: FormData) {
  const rawAmount = parseFloat(formData.get('amount') as string)
  const direction = formData.get('direction') as string
  const amount = direction === 'out' ? -Math.abs(rawAmount) : Math.abs(rawAmount)
  return {
    date:        formData.get('date') as string,
    description: formData.get('description') as string,
    amount,
    category_id: (formData.get('category_id') as string) || null,
    property_id: (formData.get('property_id') as string) || null,
    notes:       (formData.get('notes') as string) || null,
    source:      'manual' as const,
  }
}

export async function createTransaction(accountId: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('account_transactions')
    .insert({ account_id: accountId, ...txPayload(formData) })
  if (error) return { error: error.message }
  revalidatePath(`/accounts/${accountId}`)
  redirect(`/accounts/${accountId}`)
}

export async function updateTransaction(accountId: string, txId: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('account_transactions')
    .update(txPayload(formData))
    .eq('id', txId)
  if (error) return { error: error.message }
  revalidatePath(`/accounts/${accountId}`)
  redirect(`/accounts/${accountId}`)
}

export async function deleteTransaction(accountId: string, txId: string) {
  const supabase = await createClient()
  await supabase.from('account_transactions').delete().eq('id', txId)
  revalidatePath(`/accounts/${accountId}`)
  redirect(`/accounts/${accountId}`)
}

interface ImportRow { date: string; description: string; amount: number }

export async function importTransactions(
  accountId: string,
  rows: ImportRow[],
  batchId: string,
): Promise<{ imported: number } | { error: string }> {
  const supabase = await createClient()
  const inserts = rows.map(r => ({
    account_id: accountId,
    date: r.date,
    description: r.description,
    amount: r.amount,
    source: 'csv' as const,
    import_batch_id: batchId,
  }))
  const { error } = await supabase.from('account_transactions').insert(inserts)
  if (error) return { error: error.message }
  revalidatePath(`/accounts/${accountId}`)
  return { imported: inserts.length }
}

export async function undoImport(accountId: string, batchId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('account_transactions')
    .delete()
    .eq('account_id', accountId)
    .eq('import_batch_id', batchId)
  revalidatePath(`/accounts/${accountId}`)
}
