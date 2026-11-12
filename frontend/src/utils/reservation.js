// Helpers shared by the booking flow, booking list and calendar.

export const RESERVATION_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' }
]

export const reservationStatusLabel = (status) =>
  RESERVATION_STATUSES.find((item) => item.value === status)?.label || status

const pad = (value) => String(value).padStart(2, '0')

// "2026-11-13" for <input type="date"> and API filters (local date)
export function dateInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayInputValue() {
  return dateInputValue(new Date())
}

// Moves a YYYY-MM-DD value by a number of days without timezone shifts
export function shiftDateInput(value, days) {
  const [year, month, day] = String(value).split('-').map(Number)
  return dateInputValue(new Date(year, month - 1, day + days))
}

// Monday of the week containing the given YYYY-MM-DD value
export function mondayOf(value) {
  const [year, month, day] = String(value).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const weekday = date.getDay()
  date.setDate(date.getDate() + (weekday === 0 ? -6 : 1 - weekday))
  return dateInputValue(date)
}

export function formatBookingDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export function formatBookingTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// "Fri, 13 Nov 2026 · 10:00–12:00"
export function formatBookingRange(startsAt, endsAt) {
  return `${formatBookingDate(startsAt)} · ${formatBookingTime(startsAt)}–${formatBookingTime(endsAt)}`
}

// Date key (YYYY-MM-DD) used to group bookings in the calendar
export function localDateKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return dateInputValue(date)
}
