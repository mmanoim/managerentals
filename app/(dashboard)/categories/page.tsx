import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { archiveCategory } from '@/app/actions/categories'

const TYPE_LABEL: Record<string, string> = {
  income:   'Income',
  expense:  'Expense',
  transfer: 'Transfer',
}

const TYPE_ORDER = ['income', 'expense', 'transfer']

export default async function CategoriesPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, type, archived')
    .order('code')

  const { data: usageRows } = await supabase
    .from('account_transactions')
    .select('category_id')

  const usageCount: Record<string, number> = {}
  for (const row of usageRows ?? []) {
    if (row.category_id) usageCount[row.category_id] = (usageCount[row.category_id] ?? 0) + 1
  }

  const grouped = TYPE_ORDER.reduce<Record<string, typeof categories>>((acc, type) => {
    acc[type] = (categories ?? []).filter(c => c.type === type)
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chart of Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">{categories?.length ?? 0} categories</p>
        </div>
        <Link
          href="/categories/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          + Add category
        </Link>
      </div>

      {TYPE_ORDER.map(type => {
        const items = grouped[type] ?? []
        if (items.length === 0) return null
        return (
          <section key={type}>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              {TYPE_LABEL[type]}
            </h2>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 w-20">Code</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Name</th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 w-24">Transactions</th>
                    <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3 w-32">Status</th>
                    <th className="px-4 py-3 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(cat => (
                    <tr key={cat.id} className={cat.archived ? 'opacity-50' : 'hover:bg-slate-50'}>
                      <td className="px-4 py-3 font-mono text-slate-500">{cat.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{cat.name}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {usageCount[cat.id] ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form
                          action={async () => {
                            'use server'
                            await archiveCategory(cat.id, !cat.archived)
                          }}
                        >
                          <button
                            type="submit"
                            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                              cat.archived
                                ? 'border-slate-300 text-slate-500 hover:bg-slate-100'
                                : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                          >
                            {cat.archived ? 'Archived' : 'Active'}
                          </button>
                        </form>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/categories/${cat.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}
