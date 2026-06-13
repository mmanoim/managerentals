'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function finalizeReconciliation(
  accountId: string,
  txIds: string[],
): Promise<{ success: true } | { error: string }> {
  if (txIds.length === 0) return { error: 'No transactions selected' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('account_transactions')
    .update({ reconciled: true })
    .in('id', txIds)
    .eq('account_id', accountId)
  if (error) return { error: error.message }
  revalidatePath(`/reconciliation/${accountId}`)
  revalidatePath(`/accounts/${accountId}`)
  return { success: true }
}
