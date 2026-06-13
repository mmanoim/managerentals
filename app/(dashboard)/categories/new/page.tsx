import Link from 'next/link'
import CategoryForm from '@/components/CategoryForm'
import { createCategory } from '@/app/actions/categories'

export default function NewCategoryPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/categories" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← Back to categories
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">New category</h1>
      </div>
      <CategoryForm action={createCategory} />
    </div>
  )
}
