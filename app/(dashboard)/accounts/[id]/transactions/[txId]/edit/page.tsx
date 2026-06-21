import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TransactionForm from '@/components/TransactionForm'
import DeleteEntryButton from '@/components/DeleteEntryButton'
import { updateTransaction, deleteTransaction } from '@/app/actions/account_transactions'

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string; txId: string }>
}) {
  const { id, txId } = await params
  const supabase = await createClient()

  const [{ data: account }, { data: tx }, { data: categories }, { data: properties }, { data: allAccounts }] = await Promise.all([
    supabase.from('accounts').select('id, name, type').eq('id', id).single(),
    supabase.from('account_transactions').select('*').eq('id', txId).eq('account_id', id).single(),
    supabase.from('chart_of_accounts').select('id, code, name').eq('archived', false).order('code'),
    supabase.from('properties').select('id, address').eq('archived', false).order('address'),
    supabase.from('accounts').select('id, name, type').eq('is_active', true).order('name'),
  ])

  if (!account || !tx) notFound()

  // Accounts available for linking (partner + liability), not shown when editing from those account types
  const linkableTypes = ['partner', 'liability']
  const partnerAccounts = !linkableTypes.includes((account as any).type)
    ? (allAccounts ?? []).filter((a: any) => linkableTypes.includes(a.type))
    : []

  // If already linked via transfer_pair_id, find the other side
  let existingPartnerLink: string | undefined
  if (tx.transfer_pair_id && partnerAccounts.length > 0) {
    const { data: linked } = await supabase
      .from('account_transactions')
      .select('account_id')
      .eq('transfer_pair_id', tx.transfer_pair_id)
      .neq('account_id', id)
      .limit(1)
      .single()
    if (linked) {
      const match = partnerAccounts.find((a: any) => a.id === linked.account_id)
      if (match) existingPartnerLink = (match as any).name
    }
  }

  const updateWithIds = updateTransaction.bind(null, id, txId)
  const deleteWithIds = deleteTransaction.bind(null, id, txId)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/accounts/${id}`}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {account.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit transaction</h1>
      </div>
      <TransactionForm
        action={updateWithIds}
        categories={categories ?? []}
        properties={properties ?? []}
        accounts={(allAccounts ?? []).filter((a: any) => a.id !== id && !linkableTypes.includes(a.type))}
        partnerAccounts={partnerAccounts}
        existingPartnerLink={existingPartnerLink}
        defaultValues={tx}
      />
      <div className="mt-6 pt-6 border-t border-slate-200">
        <DeleteEntryButton action={deleteWithIds as any} />
      </div>
    </div>
  )
}
