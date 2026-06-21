'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, refresh } from 'next/cache'
import { redirect } from 'next/navigation'

function txPayload(formData: FormData) {
  const rawAmount = parseFloat(formData.get('amount') as string)
  const direction = formData.get('direction') as string
  const amount = direction === 'out' ? -Math.abs(rawAmount) : Math.abs(rawAmount)
  return {
    date:         formData.get('date') as string,
    description:  formData.get('description') as string,
    amount,
    category_id:  (formData.get('category_id') as string) || null,
    property_id:  (formData.get('property_id') as string) || null,
    payee:        (formData.get('payee') as string) || null,
    check_number: (formData.get('check_number') as string) || null,
    notes:        (formData.get('notes') as string) || null,
    source:       'manual' as const,
  }
}

export async function createTransaction(accountId: string, formData: FormData) {
  const transferToId = (formData.get('transfer_to_account_id') as string) || null

  if (transferToId) {
    const supabase = await createClient()
    const { data: accts } = await supabase
      .from('accounts')
      .select('id, name')
      .in('id', [accountId, transferToId])

    const fromName = accts?.find(a => a.id === accountId)?.name ?? 'source'
    const toName   = accts?.find(a => a.id === transferToId)?.name ?? 'destination'
    const rawAmount = parseFloat(formData.get('amount') as string)
    const date  = formData.get('date') as string
    const notes = (formData.get('notes') as string) || null
    const pairId = crypto.randomUUID()

    const { error } = await supabase.from('account_transactions').insert([
      {
        account_id: accountId,
        date,
        description: `Transfer to ${toName}`,
        amount: -Math.abs(rawAmount),
        source: 'manual' as const,
        transfer_pair_id: pairId,
        notes,
      },
      {
        account_id: transferToId,
        date,
        description: `Transfer from ${fromName}`,
        amount: Math.abs(rawAmount),
        source: 'manual' as const,
        transfer_pair_id: pairId,
        notes,
      },
    ])
    if (error) return { error: error.message }
    revalidatePath(`/accounts/${accountId}`)
    revalidatePath(`/accounts/${transferToId}`)
    redirect(`/accounts/${accountId}`)
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('account_transactions')
    .insert({ account_id: accountId, ...txPayload(formData) })
  if (error) return { error: error.message }
  revalidatePath(`/accounts/${accountId}`)
  redirect(`/accounts/${accountId}`)
}

export async function updateTransaction(accountId: string, txId: string, formData: FormData) {
  const partnerAccountId = (formData.get('partner_account_id') as string) || null
  const supabase = await createClient()

  const { data: updated, error } = await supabase
    .from('account_transactions')
    .update(txPayload(formData))
    .eq('id', txId)
    .select('transfer_pair_id, amount, date, description, category_id')
    .single()
  if (error) return { error: error.message }

  // Create partner account entry if requested and not already linked
  if (partnerAccountId && !updated.transfer_pair_id) {
    const pairId = crypto.randomUUID()

    const { data: partnerAccount } = await supabase
      .from('accounts').select('name, type').eq('id', partnerAccountId).single()

    // For bank/payapp transfers the linked entry is the opposite sign (money leaving one = arriving in other).
    // For partner/liability accounts the same sign is kept (recording a shared receipt or deposit).
    const transferTypes = ['bank', 'payapp']
    const linkedAmount = transferTypes.includes((partnerAccount as any)?.type)
      ? -updated.amount
      : updated.amount

    await Promise.all([
      supabase.from('account_transactions').update({ transfer_pair_id: pairId }).eq('id', txId),
      supabase.from('account_transactions').insert({
        account_id: partnerAccountId,
        date: updated.date,
        description: updated.description,
        amount: linkedAmount,
        category_id: updated.category_id,
        source: 'manual' as const,
        transfer_pair_id: pairId,
        reconciled: false,
      }),
    ])

    revalidatePath(`/accounts/${partnerAccountId}`)
  }

  revalidatePath(`/accounts/${accountId}`)
  redirect(`/accounts/${accountId}`)
}

export async function patchTransactionNotes(txId: string, notes: string | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('account_transactions')
    .update({ notes: notes || null })
    .eq('id', txId)
  if (error) return { error: error.message }
  refresh()
}

export async function patchTransactionCategory(txId: string, accountId: string, categoryId: string | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('account_transactions')
    .update({ category_id: categoryId || null })
    .eq('id', txId)
  if (error) return { error: error.message }
  refresh()
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
