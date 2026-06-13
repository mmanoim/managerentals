import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const TYPE_LABELS: Record<string, string> = {
  bank: 'Bank Account', payapp: 'Payment App', cash: 'Cash', credit: 'Credit Card',
}
const OWNER_LABELS: Record<string, string> = {
  joint: 'Joint', marina: 'Marina', jacob: 'Jacob',
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default async function ReconciliationPage() {
  const supabase = await createClient()

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, type, owner, institution, last_four, opening_balance, is_active')
    .eq('is_active', true)
    .order('name')

  const accountIds = (accounts ?? []).map(a => a.id)

  // Unreconciled counts and last reconciled date per account
  const { data: unreconciledRows } = await supabase
    .from('account_transactions')
    .select('account_id, reconciled, amount')
    .in('account_id', accountIds)

  const statsByAccount: Record<string, { unreconciled: number; reconciledBalance: number; totalBalance: number }> = {}
  for (const a of accounts ?? []) {
    statsByAccount[a.id] = { unreconciled: 0, reconciledBalance: Number(a.opening_balance), totalBalance: Number(a.opening_balance) }
  }
  for (const row of unreconciledRows ?? []) {
    const s = statsByAccount[row.account_id]
    if (!s) continue
    s.totalBalance += Number(row.amount)
    if (row.reconciled) {
      s.reconciledBalance += Number(row.amount)
    } else {
      s.unreconciled++
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Reconciliation</h1>
        <p className="text-slate-500 text-sm mt-1">
          Match your records against bank statements to confirm accuracy.
        </p>
      </div>

      {(accounts ?? []).length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-600 font-medium">No accounts yet</p>
          <Link href="/accounts/new" className="mt-3 inline-block text-indigo-600 text-sm font-medium hover:underline">
            Add an account →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {(accounts ?? []).map(account => {
            const stats = statsByAccount[account.id]
            const outstanding = stats.totalBalance - stats.reconciledBalance
            const hasUnreconciled = stats.unreconciled > 0
            return (
              <div key={account.id} className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{account.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {TYPE_LABELS[account.type]} · {OWNER_LABELS[account.owner]}
                    {account.institution ? ` · ${account.institution}` : ''}
                    {account.last_four ? ` ···· ${account.last_four}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-8 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Reconciled balance</p>
                    <p className="text-base font-bold tabular-nums text-slate-700 mt-0.5">
                      {fmtCurrency(stats.reconciledBalance)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Outstanding</p>
                    <p className={`text-base font-bold tabular-nums mt-0.5 ${hasUnreconciled ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {hasUnreconciled ? `${stats.unreconciled} tx` : '✓ All clear'}
                    </p>
                  </div>
                  <Link
                    href={`/reconciliation/${account.id}`}
                    className={
                      hasUnreconciled
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors'
                        : 'border border-slate-300 hover:border-slate-400 text-slate-600 text-sm font-semibold px-4 py-2 rounded-lg transition-colors'
                    }
                  >
                    {hasUnreconciled ? 'Reconcile' : 'Review'}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
