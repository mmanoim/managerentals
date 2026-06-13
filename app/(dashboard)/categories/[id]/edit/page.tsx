import { notFound } from 'next/navigation'
import Link from 'next/link'
import CategoryForm from '@/components/CategoryForm'
import { updateCategory, archiveCategory } from '@/app/actions/categories'
import { createClient } from '@/lib/supabase/server'

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: cat } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, type, archived')
    .eq('id', id)
    .single()

  if (!cat) notFound()

  const updateAction = updateCategory.bind(null, id)

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/categories" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← Back to categories
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Edit category</h1>
      </div>

      <CategoryForm
        action={updateAction}
        defaultValues={{ code: cat.code, name: cat.name, type: cat.type }}
      />

      <div className="border-t border-slate-200 pt-6">
        <form
          action={async () => {
            'use server'
            await archiveCategory(id, !cat.archived)
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Archive this category</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Archived categories are hidden from dropdowns but existing data is preserved.
              </p>
            </div>
            <button
              type="submit"
              className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
                cat.archived
                  ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                  : 'border-red-300 text-red-700 hover:bg-red-50'
              }`}
            >
              {cat.archived ? 'Unarchive' : 'Archive'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
