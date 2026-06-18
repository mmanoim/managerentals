import { createClient } from '@/lib/supabase/server'
import ReportsForm from '@/components/ReportsForm'

export default async function ReportsPage() {
  const supabase = await createClient()
  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase.from('accounts').select('id, name, type').eq('is_active', true).order('name'),
    supabase.from('chart_of_accounts').select('id, code, name').eq('archived', false).order('code'),
  ])

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Generate P&amp;L and transaction extracts, or look up transactions by category
        </p>
      </div>
      <ReportsForm accounts={accounts ?? []} categories={categories ?? []} />
    </div>
  )
}
