'use client'

import { useState, useTransition } from 'react'
import { runMonthlyBatch } from '@/app/actions/monthly_batch'

export default function RunBatchButton({ month, disabled }: { month: string; disabled?: boolean }) {
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleRun() {
    setResult(null)
    setError(null)
    startTransition(async () => {
      try {
        const r = await runMonthlyBatch(month)
        setResult(r)
      } catch (e: any) {
        setError(e?.message ?? 'Unknown error')
      }
    })
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleRun}
        disabled={pending || disabled}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
      >
        {pending ? 'Running…' : 'Run Batch'}
      </button>
      {result && (
        <p className="text-sm text-emerald-700 font-medium">
          Done — {result.created} created, {result.skipped} already existed
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
