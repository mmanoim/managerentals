'use client'

import { useActionState } from 'react'

const TYPE_OPTIONS = [
  { value: 'income',    label: 'Income (P&L)' },
  { value: 'expense',   label: 'Expense (P&L)' },
  { value: 'liability', label: 'Liability (Balance Sheet)' },
  { value: 'equity',    label: 'Equity (Balance Sheet)' },
  { value: 'transfer',  label: 'Transfer (not P&L)' },
  { value: 'partner',   label: 'Partner' },
]

interface DefaultValues {
  code?: string
  name?: string
  type?: string
}

interface Props {
  action: (formData: FormData) => Promise<{ error: string } | void>
  defaultValues?: DefaultValues
}

export default function CategoryForm({ action, defaultValues }: Props) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      const result = await action(formData)
      return result ?? null
    },
    null,
  )

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Code <span className="text-red-500">*</span>
          </label>
          <input
            name="code"
            required
            defaultValue={defaultValues?.code ?? ''}
            placeholder="e.g. 5010"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-400 mt-1">Income: 4xxx · Expense: 5xxx · Transfer: 6xxx</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            name="type"
            required
            defaultValue={defaultValues?.type ?? ''}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Select type…</option>
            {TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          required
          defaultValue={defaultValues?.name ?? ''}
          placeholder="e.g. Repairs & Maintenance"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          {isPending ? 'Saving…' : 'Save category'}
        </button>
      </div>
    </form>
  )
}
