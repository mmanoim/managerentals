import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TenantForm from '@/components/TenantForm'
import ArchiveButton from '@/components/ArchiveButton'
import { updateTenant, archiveTenant } from '@/app/actions/tenants'

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single()

  if (!tenant) notFound()

  const updateWithId = updateTenant.bind(null, id)
  const archiveWithId = archiveTenant.bind(null, id)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/tenants/${id}`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to tenant
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-3">Edit tenant</h1>
      </div>
      <TenantForm action={updateWithId} defaultValues={tenant} />
      <div className="mt-6 pt-6 border-t border-slate-200">
        <ArchiveButton action={archiveWithId} label="tenant" />
      </div>
    </div>
  )
}
