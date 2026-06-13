import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import UnitList from '@/components/UnitList'

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('archived', false)
    .single()

  if (!property) notFound()

  const { data: units } = await supabase
    .from('units')
    .select('*')
    .eq('property_id', id)
    .eq('archived', false)
    .order('unit_label')

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/properties" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Properties
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{property.address}</h1>
          <p className="text-slate-500 mt-0.5">{property.city}{property.state ? `, ${property.state}` : ''} {property.zip}</p>
        </div>
        <Link
          href={`/properties/${id}/edit`}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Property info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {property.purchase_date && (
          <InfoCard label="Purchase date" value={new Date(property.purchase_date).toLocaleDateString()} />
        )}
        {property.purchase_price && (
          <InfoCard label="Purchase price" value={`$${Number(property.purchase_price).toLocaleString()}`} />
        )}
        <InfoCard label="Units" value={String(units?.length ?? 0)} />
      </div>

      {property.notes && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          {property.notes}
        </div>
      )}

      {/* Units section */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Units</h2>
        <UnitList units={units ?? []} propertyId={id} />
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="font-semibold text-slate-900">{value}</p>
    </div>
  )
}
