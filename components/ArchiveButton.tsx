'use client'

interface ArchiveButtonProps {
  action: () => Promise<void>
  label: string
}

export default function ArchiveButton({ action, label }: ArchiveButtonProps) {
  return (
    <button
      type="button"
      onClick={async () => {
        if (confirm(`Archive this ${label}?`)) await action()
      }}
      className="text-sm text-red-600 hover:text-red-700 font-medium"
    >
      Archive {label}
    </button>
  )
}
