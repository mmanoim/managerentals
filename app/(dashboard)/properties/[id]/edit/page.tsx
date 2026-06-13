import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PropertyForm from '@/components/PropertyForm'
import { updateProperty, archiveProperty } from '@/app/actions/properties'

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  if (!property) notFound()

  const updateWithId = updateProperty.bind(null, id)
  const archiveWithId = archiveProperty.bind(null, id)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/properties/${id}`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to property
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-3">Edit property</h1>
      </div>
      <PropertyForm action={updateWithId} defaultValues={property} />
      <div className="mt-6 pt-6 border-t border-slate-200">
        <form action={archiveWithId}>
          <button
            type="submit"
            className="text-sm text-red-600 hover:text-red-700 font-medium"
            onClick={(e) => { if (!confirm('Archive this property?')) e.preventDefault() }}
          >
            Archive property
          </button>
        </form>
      </div>
    </div>
  )
}
