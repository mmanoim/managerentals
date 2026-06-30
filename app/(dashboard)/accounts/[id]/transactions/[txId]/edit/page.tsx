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

  const [{ data: account }, { data: tx }, { data: categories }, { data: properties }, { data: allAccounts }, { data: leaseRows }] = await Promise.all([
    supabase.from('accounts').select('id, name, type, payment_method').eq('id', id).single(),
    supabase.from('account_transactions').select('*').eq('id', txId).eq('account_id', id).single(),
    supabase.from('chart_of_accounts').select('id, code, name').eq('archived', false).order('code'),
    supabase.from('properties').select('id, address').eq('archived', false).order('address'),
    supabase.from('accounts').select('id, name, type').eq('is_active', true).order('name'),
    supabase.from('leases').select(`
      id, rent_amount,
      units:unit_id(unit_label, properties:property_id(address)),
      lease_tenants(is_primary, tenants:tenant_id(first_name, last_name))
    `).eq('status', 'active'),
  ])

  if (!account || !tx) notFound()

  // Build lease options for bank accounts that have a payment_method
  const allLeaseOptions = (leaseRows ?? []).map((l: any) => {
    const unit = l.units
    const tenants = (l.lease_tenants as any[]) ?? []
    const tenantNames = tenants
      .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
      .map((lt: any) => `${lt.tenants?.first_name ?? ''} ${lt.tenants?.last_name ?? ''}`.trim())
      .join(', ')
    const address = unit?.properties?.address ?? ''
    const unitLabel = unit?.unit_label ?? ''
    const rent = Number(l.rent_amount).toLocaleString()
    return { id: l.id as string, label: `${tenantNames} · ${address} · ${unitLabel} ($${rent}/mo)` }
  })

  const leasesForForm = (account as any)?.payment_method ? allLeaseOptions : []

  // If already linked to a ledger entry via source_payment_part_id, find the label
  let existingLeaseLink: string | undefined
  if ((tx as any)?.source_payment_part_id) {
    const { data: partRow } = await supabase
      .from('ledger_payment_parts')
      .select('ledger_entry_id')
      .eq('id', (tx as any).source_payment_part_id)
      .single()
    if (partRow) {
      const { data: ledgerRow } = await supabase
        .from('lease_ledger_entries')
        .select('lease_id')
        .eq('id', partRow.ledger_entry_id)
        .single()
      if (ledgerRow) {
        const matched = allLeaseOptions.find(l => l.id === ledgerRow.lease_id)
        existingLeaseLink = matched?.label ?? 'an inactive lease'
      }
    }
  }

  // Link section hidden only when editing from a partner/liability account (they are the "other side")
  const noLinkTypes = ['partner', 'liability']
  const partnerAccounts = !noLinkTypes.includes((account as any).type)
    ? (allAccounts ?? []).filter((a: any) =>
        ['partner', 'liability', 'payapp', 'bank'].includes(a.type) && a.id !== id
      )
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
        accounts={(allAccounts ?? []).filter((a: any) => a.id !== id && !noLinkTypes.includes(a.type))}
        partnerAccounts={partnerAccounts}
        existingPartnerLink={existingPartnerLink}
        leases={leasesForForm}
        existingLeaseLink={existingLeaseLink}
        defaultValues={tx}
      />
      <div className="mt-6 pt-6 border-t border-slate-200">
        <DeleteEntryButton action={deleteWithIds as any} />
      </div>
    </div>
  )
}
