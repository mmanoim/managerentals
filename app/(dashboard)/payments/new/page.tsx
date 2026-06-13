import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import SelectLeaseForm from '@/components/SelectLeaseForm'

export default async function NewPaymentSelectPage() {
  const supabase = await createClient()

  const [{ data: properties }, { data: units }, { data: leases }] = await Promise.all([
    supabase
      .from('properties')
      .select('id, address')
      .eq('archived', false)
      .order('address'),
    supabase
      .from('units')
      .select('id, unit_label, property_id')
      .eq('archived', false)
      .order('unit_label'),
    supabase
      .from('leases')
      .select('id, unit_id, status, rent_amount, lease_tenants(is_primary, tenant:tenants(first_name, last_name))')
      .in('status', ['active', 'month_to_month'])
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="max-w-md">
      <div className="mb-6">
        <Link href="/payments"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Payments
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Record payment</h1>
        <p className="text-slate-500 mt-0.5">Select the lease to record a payment against</p>
      </div>

      <SelectLeaseForm
        properties={properties ?? []}
        units={units ?? []}
        leases={(leases ?? []) as any}
      />
    </div>
  )
}
