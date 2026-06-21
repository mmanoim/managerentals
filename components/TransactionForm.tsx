'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Tables } from '@/lib/supabase/types'

interface Category { id: string; code: string; name: string }
interface Property { id: string; address: string }
interface Account  { id: string; name: string }

interface TransactionFormProps {
  action: (formData: FormData) => Promise<{ error: string } | void>
  categories: Category[]
  properties: Property[]
  accounts?: Account[]           // other accounts available for transfers
  partnerAccounts?: Account[]    // partner accounts available for linking
  existingPartnerLink?: string   // name of already-linked partner account
  defaultValues?: Partial<Tables<'account_transactions'>>
}

export default function TransactionForm({ action, categories, properties, accounts, partnerAccounts, existingPartnerLink, defaultValues }: TransactionFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isTransfer, setIsTransfer] = useState(false)

  // Derive initial direction from the stored amount sign (edit mode)
  const storedAmount = defaultValues?.amount !== undefined ? Number(defaultValues.amount) : undefined
  const [direction, setDirection] = useState<'in' | 'out'>(
    storedAmount !== undefined && storedAmount < 0 ? 'out' : 'in'
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await action(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const inputClass = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm'

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
          <input name="date" type="date" required
            defaultValue={defaultValues?.date ?? today}
            className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount *</label>
          {/* Direction toggle + amount field */}
          <div className="flex">
            <div className="flex border border-slate-300 rounded-l-lg overflow-hidden flex-shrink-0">
              <button
                type="button"
                onClick={() => setDirection('in')}
                className={`px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  direction === 'in'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                In
              </button>
              <button
                type="button"
                onClick={() => setDirection('out')}
                className={`px-3.5 py-2.5 text-sm font-semibold transition-colors border-l border-slate-300 ${
                  direction === 'out'
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                Out
              </button>
            </div>
            <input type="hidden" name="direction" value={direction} />
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={storedAmount !== undefined ? Math.abs(storedAmount) : undefined}
                placeholder="0.00"
                className="w-full pl-7 pr-3.5 py-2.5 border border-l-0 border-slate-300 rounded-r-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            {direction === 'in' ? '＋ Money received or deposited' : '－ Money paid or withdrawn'}
          </p>
        </div>
      </div>

      {/* Transfer toggle — only shown when other accounts are available */}
      {accounts && accounts.length > 0 && !defaultValues?.id && (
        <div className="flex items-center gap-3 py-1">
          <button
            type="button"
            onClick={() => setIsTransfer(t => !t)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
              isTransfer ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isTransfer ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
          <span className="text-sm font-medium text-slate-700">This is a transfer between accounts</span>
        </div>
      )}

      {isTransfer ? (
        <>
          <input type="hidden" name="direction" value="out" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Transfer to *</label>
            <select name="transfer_to_account_id" required className={`${inputClass} bg-white`}>
              <option value="">Select destination account…</option>
              {(accounts ?? []).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1.5">
              A matching deposit will be created automatically in the destination account.
            </p>
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="transfer_to_account_id" value="" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description *</label>
            <input name="description" required
              defaultValue={defaultValues?.description ?? undefined}
              className={inputClass}
              placeholder="e.g. Rent from Unit 1, Plumber – kitchen sink, Insurance payment" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select name="category_id"
                defaultValue={defaultValues?.category_id ?? ''}
                className={`${inputClass} bg-white`}
              >
                <option value="">— Uncategorized —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Property</label>
              <select name="property_id"
                defaultValue={defaultValues?.property_id ?? ''}
                className={`${inputClass} bg-white`}
              >
                <option value="">— None —</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.address}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Payee</label>
              <input name="payee"
                defaultValue={(defaultValues as any)?.payee ?? undefined}
                className={inputClass}
                placeholder="e.g. Home Depot, USPS" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Check #</label>
              <input name="check_number"
                defaultValue={(defaultValues as any)?.check_number ?? undefined}
                className={inputClass}
                placeholder="e.g. 1042" />
            </div>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
        <textarea name="notes" rows={2}
          defaultValue={defaultValues?.notes ?? undefined}
          className={`${inputClass} resize-none`}
          placeholder="Reference number, check number, or any additional detail…" />
      </div>

      {/* Partner account linking — only shown on non-partner accounts */}
      {existingPartnerLink ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p className="text-sm text-emerald-700">
            Linked to <span className="font-semibold">{existingPartnerLink}</span>
          </p>
          <input type="hidden" name="partner_account_id" value="" />
        </div>
      ) : partnerAccounts && partnerAccounts.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Link to account <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <select name="partner_account_id" className={`${inputClass} bg-white`}>
            <option value="">— None —</option>
            {partnerAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <p className="text-xs text-slate-400">
            Creates a matching entry in the selected account to record the other side of the transfer.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm">
          {loading ? 'Saving…' : 'Save transaction'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-colors text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
