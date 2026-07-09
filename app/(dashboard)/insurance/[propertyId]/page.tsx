import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DeleteEntryButton from '@/components/DeleteEntryButton'
import { createPolicy, updatePolicy, deletePolicy } from '@/app/actions/insurance'

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return new Date(Number(y), Number(m) - 1, Number(day))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(dateStr + 'T00:00:00')
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const inp = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm'

function PolicyForm({
  action,
  cancelHref,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>
  cancelHref: string
  defaultValues?: {
    company?: string
    policy_number?: string
    premium?: string
    effective_date?: string
    expiration_date?: string
    notes?: string
    is_active?: boolean
  }
  submitLabel: string
}) {
  return (
    <form action={action} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Insurance company *</label>
          <input
            name="company"
            required
            defaultValue={defaultValues?.company}
            placeholder="e.g. State Farm"
            className={inp}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Policy number</label>
          <input
            name="policy_number"
            defaultValue={defaultValues?.policy_number}
            placeholder="Optional"
            className={inp}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Annual premium ($)</label>
          <input
            name="premium"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.premium}
            placeholder="0.00"
            className={inp}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Effective date *</label>
          <input
            name="effective_date"
            type="date"
            required
            defaultValue={defaultValues?.effective_date}
            className={inp}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiration date *</label>
          <input
            name="expiration_date"
            type="date"
            required
            defaultValue={defaultValues?.expiration_date}
            className={inp}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={defaultValues?.notes}
            placeholder="Optional notes"
            className={`${inp} resize-none`}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="is_active"
          id="is_active"
          defaultChecked={defaultValues?.is_active ?? true}
          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="is_active" className="text-sm text-slate-700">
          Mark as active policy
        </label>
      </div>
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors text-sm"
        >
          {submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="text-slate-600 hover:text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-colors text-sm"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}

export default async function PropertyInsurancePage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>
  searchParams: Promise<{ form?: string; id?: string }>
}) {
  const { propertyId } = await params
  const { form, id: editId } = await searchParams
  const supabase = await createClient()

  const [{ data: property }, { data: policies }] = await Promise.all([
    supabase.from('properties').select('id, address').eq('id', propertyId).single(),
    supabase
      .from('property_insurance_policies')
      .select('*')
      .eq('property_id', propertyId)
      .order('effective_date', { ascending: false }),
  ])

  if (!property) notFound()

  const editPolicy = editId ? (policies ?? []).find(p => p.id === editId) : null
  const baseHref = `/insurance/${propertyId}`

  const createAction = createPolicy.bind(null, propertyId)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/insurance" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Insurance
        </Link>
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Insurance Policies</h1>
            <p className="text-slate-500 mt-0.5">{property.address}</p>
          </div>
          {form !== 'new' && !editId && (
            <Link
              href="?form=new"
              className="text-sm font-medium text-white px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors flex-shrink-0"
            >
              + Add policy
            </Link>
          )}
        </div>
      </div>

      {form === 'new' && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-slate-900 mb-3">New policy</h2>
          <PolicyForm action={createAction} cancelHref={baseHref} submitLabel="Save policy" />
        </div>
      )}

      {editPolicy && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Edit policy</h2>
          <PolicyForm
            action={updatePolicy.bind(null, editPolicy.id, propertyId)}
            cancelHref={baseHref}
            defaultValues={{
              company: editPolicy.company,
              policy_number: editPolicy.policy_number ?? '',
              premium: editPolicy.premium?.toString() ?? '',
              effective_date: editPolicy.effective_date,
              expiration_date: editPolicy.expiration_date,
              notes: editPolicy.notes ?? '',
              is_active: editPolicy.is_active,
            }}
            submitLabel="Update policy"
          />
        </div>
      )}

      {(policies ?? []).length === 0 && form !== 'new' ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-400">
          No policies on record —{' '}
          <Link href="?form=new" className="text-indigo-600 hover:text-indigo-700 font-medium">
            add one
          </Link>
        </div>
      ) : (policies ?? []).length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Company</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Period</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Premium/yr</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(policies ?? []).map(policy => {
                const days = daysUntil(policy.expiration_date)
                const deletePolicyAction = deletePolicy.bind(null, policy.id, propertyId)
                return (
                  <tr key={policy.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{policy.company}</div>
                      {policy.policy_number && (
                        <div className="text-xs text-slate-400 mt-0.5">#{policy.policy_number}</div>
                      )}
                      {policy.notes && (
                        <div className="text-xs text-slate-400 mt-0.5">{policy.notes}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      {fmtDate(policy.effective_date)} – {fmtDate(policy.expiration_date)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {policy.premium
                        ? `$${Number(policy.premium).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {policy.is_active ? (
                        days < 0 ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Expired</span>
                        ) : days <= 30 ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">{days}d left</span>
                        ) : days <= 60 ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{days}d left</span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                        )
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Past</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`?form=edit&id=${policy.id}`}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Edit
                        </Link>
                        <DeleteEntryButton action={deletePolicyAction} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
