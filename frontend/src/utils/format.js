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
