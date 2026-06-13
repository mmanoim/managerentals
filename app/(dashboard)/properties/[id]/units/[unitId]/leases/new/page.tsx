import { redirect } from 'next/navigation'

export default async function OldNewLeasePage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>
}) {
  const { id: propertyId, unitId } = await params
  redirect(`/leases/new?propertyId=${propertyId}&unitId=${unitId}`)
}
