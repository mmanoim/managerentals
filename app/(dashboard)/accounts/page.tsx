import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { toggleAccountActive } from '@/app/actions/accounts'

const TYPE_GROUP_LABELS: Record<string, string> = {
  bank:      'Bank Accounts',
  payapp:    'Payment Apps',
  cash:      'Cash',
  credit:    'Credit Cards',
  partner:   'Partner Accounts',
  liability: 'Liabilities',
}

const OWNER_LABELS: Record<string, string> = {
  joint:  'Joint',
  marina: 'Marina',
  jacob:  'Jacob',
}

const OWNER_COLORS: Record<string, string> = {
  joint:  'bg-indigo-50 text-indigo-700',
  marina: 'bg-purple-50 text-purple-700',
  jacob:  'bg-sky-50 text-sky-700',
}

function fmt(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export default async function AccountsPage() {
  const supabase = await createClient()

  const [{ data: accounts }, { data: txData }] = await Promise.all([
    supabase.from('accounts').select('*').order('type').order('name'),
    supabase.from('account_transactions').select('account_id, amount'),
  ])

  // Sum transactions per account
  const totals = new Map<string, number>()
  for (const tx of txData ?? []) {
    totals.set(tx.account_id, (totals.get(tx.account_id) ?? 0) + Number(tx.amount))
  }

  const rows = (accounts ?? []).map(a => ({
    ...a,
    balance: Number(a.opening_balance) + (totals.get(a.id) ?? 0),
  }))

  // Group by type in display order
  const typeOrder = ['bank', 'payapp', 'cash', 'credit', 'partner', 'liability']
  const groups: Record<string, typeof rows> = {}
  for (const a of rows) {
    if (!groups[a.type]) groups[a.type] = []
    groups[a.type].push(a)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts</h1>
          <p className="text-slate-500 text-sm mt-1">{rows.length} accounts</p>
        </div>
        <Link
          href="/accounts/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add account
        </Link>
      </div>

      {!rows.length ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-600 font-medium">No accounts yet</p>
          <p className="text-slate-400 text-sm mt-1">Add your first financial account to get started</p>
          <Link href="/accounts/new" className="mt-4 inline-block text-indigo-600 text-sm font-medium hover:underline">
            Add an account →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {typeOrder.filter(t => groups[t]).map(type => (
            <div key={type}>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {TYPE_GROUP_LABELS[type]}
              </h2>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                {groups[type].map(account => (
                  <div key={account.id}
                    className={`flex items-center gap-4 px-6 py-4 transition-opacity ${!account.is_active ? 'opacity-50' : ''}`}
                  >
                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/accounts/${account.id}`}
                          className="font-medium text-slate-900 hover:text-indigo-600 transition-colors">
                          {account.name}
                        </Link>
                        {account.last_four && (
                          <span className="text-xs text-slate-400">•••• {account.last_four}</span>
                        )}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${OWNER_COLORS[account.owner]}`}>
                          {OWNER_LABELS[account.owner]}
                        </span>
                        {!account.is_active && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            Inactive
                          </span>
                        )}
                      </div>
                      {account.institution && (
                        <p className="text-sm text-slate-400 mt-0.5">{account.institution}</p>
                      )}
                    </div>

                    {/* Balance */}
                    <div className="text-right flex-shrink-0 w-28">
                      <p className={`font-semibold tabular-nums ${account.balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {fmt(account.balance)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <form action={toggleAccountActive}>
                        <input type="hidden" name="id" value={account.id} />
                        <input type="hidden" name="current_active" value={account.is_active.toString()} />
                        <button type="submit"
                          className="text-xs text-slate-400 hover:text-slate-700 font-medium transition-colors whitespace-nowrap"
                        >
                          {account.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </form>
                      <Link href={`/accounts/${account.id}/edit`}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                        Edit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
