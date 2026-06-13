import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function PropertiesPage() {
  const supabase = await createClient()
  const { data: properties } = await supabase
    .from('properties')
    .select('*, units(count)')
    .eq('archived', false)
    .order('address')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
          <p className="text-slate-500 text-sm mt-1">{properties?.length ?? 0} properties</p>
        </div>
        <Link
          href="/properties/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add property
        </Link>
      </div>

      {!properties?.length ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">No properties yet</p>
          <p className="text-slate-400 text-sm mt-1">Add your first property to get started</p>
          <Link href="/properties/new" className="mt-4 inline-block text-indigo-600 text-sm font-medium hover:underline">
            Add a property →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => {
            const unitCount = (p.units as { count: number }[])?.[0]?.count ?? 0
            return (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
                    {unitCount} {unitCount === 1 ? 'unit' : 'units'}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900">{p.address}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{p.city}{p.state ? `, ${p.state}` : ''} {p.zip}</p>
                {p.purchase_price && (
                  <p className="text-xs text-slate-400 mt-3">
                    Purchased for ${Number(p.purchase_price).toLocaleString()}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
