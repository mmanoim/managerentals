import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReconcileSession from '@/components/ReconcileSession'
import { finalizeReconciliation } from '@/app/actions/reconciliation'

export default async function ReconciliationSessionPage({
  params,
}: {
  params: Promise<{ accountId: string }>
}) {
  const { accountId } = await params
  const supabase = await createClient()

  const [{ data: account }, { data: allTx }] = await Promise.all([
    supabase.from('accounts').select('id, name, type, owner, opening_balance').eq('id', accountId).single(),
    supabase
      .from('account_transactions')
      .select('id, date, description, amount, reconciled, source')
      .eq('account_id', accountId)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  if (!account) notFound()

  const txs = allTx ?? []
  const reconciledSum = txs
    .filter(t => t.reconciled)
    .reduce((s, t) => s + Number(t.amount), 0)
  const clearedBalance = Number(account.opening_balance) + reconciledSum

  const unreconciled = txs.filter(t => !t.reconciled)

  const finalizeWithId = finalizeReconciliation.bind(null, accountId)

  return (
    <div>
      <div className="mb-6">
        <Link href="/reconciliation"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Reconciliation
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{account.name}</h1>
        <p className="text-slate-500 text-sm mt-1">
          Check off transactions that appear on your bank statement until the difference reaches $0.
        </p>
      </div>

      <ReconcileSession
        accountId={accountId}
        openingBalance={Number(account.opening_balance)}
        clearedBalance={clearedBalance}
        transactions={unreconciled.map(t => ({
          id: t.id,
          date: t.date,
          description: t.description,
          amount: Number(t.amount),
          source: t.source,
        }))}
        finalizeAction={finalizeWithId}
      />
    </div>
  )
}
