import { createClient } from '@/lib/supabase/server'
import ReportsForm from '@/components/ReportsForm'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, type')
    .in('type', ['bank', 'credit'])
    .eq('is_active', true)
    .order('name')

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Generate P&amp;L and transaction extracts for your accountant
        </p>
      </div>
      <ReportsForm accounts={accounts ?? []} />
    </div>
  )
}
