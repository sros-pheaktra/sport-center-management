// Green for available, amber for unavailable
export default function StatusBadge({ status }) {
  const available = status === 'available'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        available ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          available ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
      />
      {available ? 'Available' : 'Unavailable'}
    </span>
  )
}
