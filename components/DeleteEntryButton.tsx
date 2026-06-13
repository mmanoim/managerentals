'use client'

interface Props {
  action: (formData: FormData) => Promise<void>
}

export default function DeleteEntryButton({ action }: Props) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium"
        onClick={(e) => { if (!confirm('Delete this entry?')) e.preventDefault() }}
      >
        ×
      </button>
    </form>
  )
}
