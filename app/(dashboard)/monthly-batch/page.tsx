import { getMonthlyBatchPreview } from '@/app/actions/monthly_batch'
import RunBatchButton from '@/components/RunBatchButton'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function StatusBadge({ exists }: { exists: boolean }) {
  return exists
    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        Already exists
      </span>
    : <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
        Will create
      </span>
}

export default async function MonthlyBatchPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const today = new Date()
  const month = monthParam ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const preview = await getMonthlyBatchPreview(month)

  const totalRent = preview.rentCharges.reduce((s, r) => s + r.amount, 0)
  const allExist = preview.rentCharges.every(r => r.exists)
    && preview.jacobInterest.exists
    && preview.marinaInterest.exists

  const [year, mon] = month.split('-').map(Number)
  const monthLabel = new Date(year, mon - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Monthly Batch</h1>
        <p className="text-sm text-slate-500 mt-1">
          Generate rent charges and interest accruals for a given month.
        </p>
      </div>

      {/* Month selector */}
      <form method="GET" className="mb-6 flex items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Month</label>
          <input
            type="month"
            name="month"
            defaultValue={month}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button type="submit"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">
          Preview
        </button>
      </form>

      <div className="space-y-6">
        {/* Rent charges */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Rent Charges</h2>
              <p className="text-xs text-slate-400 mt-0.5">Charge date based on lease start day</p>
            </div>
            <span className="text-sm font-semibold text-slate-700">{fmtCurrency(totalRent)} total</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-2.5">Tenant</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-2.5">Unit</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-2.5">Date</th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-2.5">Amount</th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {preview.rentCharges.map(r => {
                const [y, m, d] = r.entryDate.split('-')
                const dateLabel = new Date(Number(y), Number(m) - 1, Number(d))
                  .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                return (
                <tr key={r.leaseId} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{r.tenantNames}</td>
                  <td className="px-4 py-3 text-slate-500">{r.address} · {r.unit}</td>
                  <td className="px-4 py-3 text-slate-500 tabular-nums">{dateLabel}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmtCurrency(r.amount)}</td>
                  <td className="px-5 py-3 text-right"><StatusBadge exists={r.exists} /></td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Interest accruals */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Interest Accruals</h2>
            <p className="text-xs text-slate-400 mt-0.5">Monthly accrual entries in partner accounts</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-2.5">Account</th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-2.5">Description</th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-2.5">Amount</th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-900">Jacob Interest</td>
                <td className="px-4 py-3 text-slate-500">Interest accrual {monthLabel}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmtCurrency(preview.jacobInterest.amount)}</td>
                <td className="px-5 py-3 text-right"><StatusBadge exists={preview.jacobInterest.exists} /></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-900">Marina Interest</td>
                <td className="px-4 py-3 text-slate-500">Interest accrual {monthLabel}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmtCurrency(preview.marinaInterest.amount)}</td>
                <td className="px-5 py-3 text-right"><StatusBadge exists={preview.marinaInterest.exists} /></td>
              </tr>
            </tbody>
          </table>
        </div>

        <RunBatchButton month={month} disabled={allExist} />
        {allExist && (
          <p className="text-sm text-slate-400">All entries for {monthLabel} already exist.</p>
        )}
      </div>
    </div>
  )
}
