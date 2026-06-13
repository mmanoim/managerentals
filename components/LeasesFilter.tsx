'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function LeasesFilter({ showAll }: { showAll: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function toggle() {
    const params = new URLSearchParams(searchParams.toString())
    if (showAll) {
      params.delete('showAll')
    } else {
      params.set('showAll', '1')
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none mb-5">
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
        ${showAll ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}
        onClick={toggle}
      >
        {showAll && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <input type="checkbox" className="sr-only" checked={showAll} onChange={toggle} />
      <span className="text-sm text-slate-600">Show expired &amp; terminated leases</span>
    </label>
  )
}
