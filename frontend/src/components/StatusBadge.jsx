// Green for available, amber for unavailable, blue for maintenance
const STATUS_STYLES = {
  available: {
    badge: 'bg-emerald-100 text-emerald-800',
    dot: 'bg-emerald-500',
    label: 'Available'
  },
  unavailable: {
    badge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500',
    label: 'Unavailable'
  },
  maintenance: {
    badge: 'bg-sky-100 text-sky-800',
    dot: 'bg-sky-500',
    label: 'Under maintenance'
  }
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.unavailable

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
}
