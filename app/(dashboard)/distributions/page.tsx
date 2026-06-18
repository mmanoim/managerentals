import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const PARTNER_LABELS: Record<string, string> = {
  J: 'Jacob', M: 'Marina', JM: 'Both', MJ: 'Both',
}
const PARTNER_COLORS: Record<string, string> = {
  J: 'bg-blue-100 text-blue-700',
  M: 'bg-violet-100 text-violet-700',
  JM: 'bg-amber-100 text-amber-700',
  MJ: 'bg-amber-100 text-amber-700',
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return new Date(Number(y), Number(m) - 1, Number(day))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function DistributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ date_from?: string; date_to?: string }>
}) {
  const { date_from, date_to } = await searchParams
  const supabase = await createClient()

  const { data: allRows } = await supabase
    .from('distributions')
    .select('*')
    .order('date', { ascending: true })
    .order('created_at', { ascending: true })

  const rows = allRows ?? []

  // Compute running balance across all-time history
  let running = 0
  const withBalance = rows.map(row => {
    running += Number(row.amount)
    return { ...row, running_balance: running }
  })

  // Apply date filters for display and period total
  let filtered = withBalance
  if (date_from) filtered = filtered.filter(r => r.date >= date_from)
  if (date_to)   filtered = filtered.filter(r => r.date <= date_to)

  const periodTotal  = filtered.reduce((s, r) => s + Number(r.amount), 0)
  const hasFilters   = date_from || date_to

  // Newest first for display
  const displayRows = [...filtered].reverse()

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Distributions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Partner distributions from rental income</p>
        </div>
        <Link
          href="/distributions/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add distribution
        </Link>
      </div>

      {/* Filter bar + period summary */}
      <form method="GET" action="/distributions"
        className="bg-white border border-slate-200 rounded-xl px-5 py-4 mb-6 flex items-end gap-6 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
          <input type="date" name="date_from" defaultValue={date_from}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
          <input type="date" name="date_to" defaultValue={date_to}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <div className="flex gap-2">
          <button type="submit"
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            Filter
          </button>
          {hasFilters && (
            <Link href="/distributions"
              className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors">
              Clear
            </Link>
          )}
        </div>

        {/* Period summary */}
        <div className="ml-auto flex items-center gap-6 pl-6 border-l border-slate-200">
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
              {hasFilters ? 'Period total' : 'All-time total'}
            </p>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
              {fmtCurrency(periodTotal)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Distributions</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">{filtered.length}</p>
          </div>
        </div>
      </form>

      {/* Table */}
      {displayRows.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          {hasFilters ? (
            <>
              <p className="text-slate-600 font-medium">No distributions in this date range</p>
              <Link href="/distributions"
                className="mt-3 inline-block text-indigo-600 text-sm font-medium hover:underline">
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <p className="text-slate-600 font-medium">No distributions yet</p>
              <Link href="/distributions/new"
                className="mt-4 inline-block text-indigo-600 text-sm font-medium hover:underline">
                Add a distribution →
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3 whitespace-nowrap">Date</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Partner</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Source</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Destination</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Amount</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Balance</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayRows.map((row: any) => {
                const partnerLabel = PARTNER_LABELS[row.partner] ?? row.partner
                const partnerColor = PARTNER_COLORS[row.partner] ?? 'bg-slate-100 text-slate-600'
                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap tabular-nums">
                      {fmtDate(row.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${partnerColor}`}>
                        {partnerLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.source ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.destination ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-emerald-600 whitespace-nowrap">
                      {fmtCurrency(Number(row.amount))}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-700 whitespace-nowrap">
                      {fmtCurrency(row.running_balance)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">
                      {row.notes ?? ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>
              {filtered.length} distribution{filtered.length !== 1 ? 's' : ''}
              {hasFilters ? ` of ${rows.length} total` : ''}
            </span>
            <span>
              Cumulative total: <span className="font-medium text-slate-700">{fmtCurrency(running)}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
