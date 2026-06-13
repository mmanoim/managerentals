import Link from 'next/link'
import TenantForm from '@/components/TenantForm'
import { createTenant } from '@/app/actions/tenants'

export default function NewTenantPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/tenants" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to tenants
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-3">Add tenant</h1>
      </div>
      <TenantForm action={createTenant} />
    </div>
  )
}
