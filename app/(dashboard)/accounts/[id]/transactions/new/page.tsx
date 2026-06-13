import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TransactionForm from '@/components/TransactionForm'
import { createTransaction } from '@/app/actions/account_transactions'

export default async function NewTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: account }, { data: categories }, { data: properties }] = await Promise.all([
    supabase.from('accounts').select('id, name').eq('id', id).single(),
    supabase.from('chart_of_accounts').select('id, code, name').eq('archived', false).order('code'),
    supabase.from('properties').select('id, address').eq('archived', false).order('address'),
  ])

  if (!account) notFound()

  const createWithId = createTransaction.bind(null, id)

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
        <h1 className="text-2xl font-bold text-slate-900">Add transaction</h1>
      </div>
      <TransactionForm
        action={createWithId}
        categories={categories ?? []}
        properties={properties ?? []}
      />
    </div>
  )
}
