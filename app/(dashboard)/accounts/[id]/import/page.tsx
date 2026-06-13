import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CsvImporter from '@/components/CsvImporter'
import { importTransactions, undoImport } from '@/app/actions/account_transactions'

export default async function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: account }, { data: existingTxs }] = await Promise.all([
    supabase.from('accounts').select('id, name').eq('id', id).single(),
    supabase
      .from('account_transactions')
      .select('date, description, amount')
      .eq('account_id', id),
  ])

  if (!account) notFound()

  const importWithId = importTransactions.bind(null, id)
  const undoWithId = undoImport.bind(null, id)

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href={`/accounts/${id}`}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {account.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Import CSV</h1>
        <p className="text-slate-500 text-sm mt-1">
          Upload a bank statement CSV to bulk-import transactions into {account.name}.
        </p>
      </div>

      <CsvImporter
        accountId={id}
        accountName={account.name}
        existingTransactions={(existingTxs ?? []).map(t => ({
          date: t.date,
          description: t.description,
          amount: Number(t.amount),
        }))}
        importAction={importWithId}
        undoAction={undoWithId}
      />
    </div>
  )
}
