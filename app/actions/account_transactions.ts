'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function deleteTransaction(accountId: string, txId: string) {
  const supabase = await createClient()
  await supabase.from('account_transactions').delete().eq('id', txId)
  revalidatePath(`/accounts/${accountId}`)
  redirect(`/accounts/${accountId}`)
}
