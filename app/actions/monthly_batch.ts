'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const JACOB_ACCOUNT_ID   = 'af5f6d80-e48c-4f43-84ba-9726d1ae7b46'
const MARINA_ACCOUNT_ID  = '5b79a506-1250-49a1-8985-e28cef113d5f'
const ACCRUAL_CATEGORY_ID = 'dde2d7a0-dc66-4d85-9908-edd41d5129d0'

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const LONG_MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December']

function isoDate(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export interface LeaseBatchItem {
  leaseId: string
  tenantNames: string
  address: string
  unit: string
  amount: number
  exists: boolean
}

export interface MonthlyBatchPreview {
  month: string
  rentCharges: LeaseBatchItem[]
  jacobInterest: { amount: number; exists: boolean }
  marinaInterest: { amount: number; exists: boolean }
}

export async function getMonthlyBatchPreview(month: string): Promise<MonthlyBatchPreview> {
  const [year, mon] = month.split('-').map(Number)
  const entryDate = isoDate(year, mon)
  const supabase = await createClient()

  const { data: leases } = await supabase
    .from('leases')
    .select(`
      id, rent_amount,
      units:unit_id(unit_label, properties:property_id(address)),
      lease_tenants(tenants:tenant_id(first_name, last_name))
    `)
    .eq('status', 'active')

  const leaseIds = (leases ?? []).map(l => l.id)
  const { data: existingCharges } = await supabase
    .from('lease_ledger_entries')
    .select('lease_id')
    .in('lease_id', leaseIds)
    .eq('entry_date', entryDate)
    .eq('type', 'charge')
    .eq('subtype', 'rent')
  const existingSet = new Set((existingCharges ?? []).map(e => e.lease_id))

  // De-duplicate leases (multiple tenants per lease)
  const seen = new Set<string>()
  const rentCharges: LeaseBatchItem[] = []
  for (const l of leases ?? []) {
    if (seen.has(l.id)) continue
    seen.add(l.id)
    const unit = (l.units as any)
    const tenants = ((l as any).lease_tenants as any[]) ?? []
    const tenantNames = tenants
      .map((lt: any) => `${lt.tenants?.first_name ?? ''} ${lt.tenants?.last_name ?? ''}`.trim())
      .join(', ')
    rentCharges.push({
      leaseId: l.id,
      tenantNames,
      address: unit?.properties?.address ?? '',
      unit: unit?.unit_label ?? '',
      amount: Number(l.rent_amount),
      exists: existingSet.has(l.id),
    })
  }

  const shortLabel = `${SHORT_MONTHS[mon - 1]} ${year}`
  const [{ data: jRows }, { data: mRows }] = await Promise.all([
    supabase.from('account_transactions').select('id')
      .eq('account_id', JACOB_ACCOUNT_ID).eq('date', entryDate)
      .ilike('description', 'Interest accrual%').limit(1),
    supabase.from('account_transactions').select('id')
      .eq('account_id', MARINA_ACCOUNT_ID).eq('date', entryDate)
      .ilike('description', 'Interest accrual%').limit(1),
  ])

  return {
    month,
    rentCharges,
    jacobInterest:  { amount: 1023, exists: (jRows?.length ?? 0) > 0 },
    marinaInterest: { amount: 125,  exists: (mRows?.length ?? 0) > 0 },
  }
}

export async function runMonthlyBatch(month: string): Promise<{ created: number; skipped: number }> {
  const [year, mon] = month.split('-').map(Number)
  const entryDate  = isoDate(year, mon)
  const longLabel  = `${LONG_MONTHS[mon - 1]} ${year}`
  const shortLabel = `${SHORT_MONTHS[mon - 1]} ${year}`
  const supabase   = await createClient()

  const preview = await getMonthlyBatchPreview(month)
  let created = 0
  let skipped = 0

  const missingRent = preview.rentCharges.filter(r => !r.exists)
  if (missingRent.length > 0) {
    await supabase.from('lease_ledger_entries').insert(
      missingRent.map(r => ({
        lease_id:    r.leaseId,
        entry_date:  entryDate,
        type:        'charge',
        subtype:     'rent',
        description: `Rent – ${longLabel}`,
        amount:      r.amount,
      }))
    )
    created += missingRent.length
  }
  skipped += preview.rentCharges.filter(r => r.exists).length

  if (!preview.jacobInterest.exists) {
    await supabase.from('account_transactions').insert({
      account_id:  JACOB_ACCOUNT_ID,
      date:        entryDate,
      description: `Interest accrual ${shortLabel}`,
      amount:      1023,
      category_id: ACCRUAL_CATEGORY_ID,
      source:      'manual' as const,
    })
    created++
  } else { skipped++ }

  if (!preview.marinaInterest.exists) {
    await supabase.from('account_transactions').insert({
      account_id:  MARINA_ACCOUNT_ID,
      date:        entryDate,
      description: `Interest accrual ${shortLabel}`,
      amount:      125,
      category_id: ACCRUAL_CATEGORY_ID,
      source:      'manual' as const,
    })
    created++
  } else { skipped++ }

  revalidatePath('/monthly-batch')
  return { created, skipped }
}
