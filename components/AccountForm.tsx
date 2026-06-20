'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Tables } from '@/lib/supabase/types'

const TRANSACTIONAL_TYPES = [
  { value: 'bank',    label: 'Bank Account'    },
  { value: 'payapp',  label: 'Payment App'     },
  { value: 'cash',    label: 'Cash'            },
  { value: 'credit',  label: 'Credit Card'     },
  { value: 'partner', label: 'Partner Account' },
]

const BALANCE_SHEET_TYPES = [
  { value: 'liability', label: 'Liability' },
]

const OWNERS = [
  { value: 'joint',  label: 'Joint'  },
  { value: 'marina', label: 'Marina' },
  { value: 'jacob',  label: 'Jacob'  },
]

interface AccountFormProps {
  action: (formData: FormData) => Promise<{ error: string } | void>
  defaultValues?: Partial<Tables<'accounts'>>
}

export default function AccountForm({ action, defaultValues }: AccountFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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

  const inputClass = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm'
  const selectClass = `${inputClass} bg-white`

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Account name *</label>
        <input name="name" required defaultValue={defaultValues?.name}
          className={inputClass} placeholder="e.g. TD Bank Joint Checking" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Type *</label>
          <select name="type" required defaultValue={defaultValues?.type ?? 'bank'} className={selectClass}>
            <optgroup label="Transactional">
              {TRANSACTIONAL_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </optgroup>
            <optgroup label="Balance Sheet">
              {BALANCE_SHEET_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Owner *</label>
          <select name="owner" required defaultValue={defaultValues?.owner ?? 'joint'} className={selectClass}>
            {OWNERS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Institution</label>
          <input name="institution" defaultValue={defaultValues?.institution ?? undefined}
            className={inputClass} placeholder="e.g. TD Bank, Cash App" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Last 4 digits</label>
          <input name="last_four" maxLength={4} pattern="\d{0,4}"
            defaultValue={defaultValues?.last_four ?? undefined}
            className={inputClass} placeholder="1234" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Opening balance</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
          <input name="opening_balance" type="number" step="0.01"
            defaultValue={defaultValues?.opening_balance ?? 0}
            className="w-full pl-7 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            placeholder="0.00" />
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          Balance at the point you start tracking transactions in this system. Leave at $0.00 if starting fresh.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm">
          {loading ? 'Saving…' : 'Save account'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-colors text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}
