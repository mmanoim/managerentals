import Link from 'next/link'
import AccountForm from '@/components/AccountForm'
import { createAccount } from '@/app/actions/accounts'

export default function NewAccountPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/accounts"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Accounts
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Add account</h1>
      </div>
      <AccountForm action={createAccount} />
    </div>
  )
}
