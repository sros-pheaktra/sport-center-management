// Small helper for showing "just now / 2 hours ago / …" style dates
export function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// "12.50" → "$12.50" (hourly facility prices, booking totals, …)
export function formatPrice(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return `$${number.toFixed(2)}`
}

// "08:00:00" → "08:00" (MySQL TIME columns)
export function formatTime(value) {
  return String(value || '').slice(0, 5)
}

// "just now / 12 min ago / yesterday" for activity feeds. `now` is
// passed in so callers can keep render output stable.
export function formatRelativeTime(value, now) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return ''

  const seconds = Math.max(0, ((now || timestamp) - timestamp) / 1000)

  if (seconds < 45) return 'just now'
  if (seconds < 90) return '1 min ago'

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.round(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`

  return formatDate(value)
}
