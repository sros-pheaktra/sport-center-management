import { reservationStatusLabel } from '../utils/reservation'

// Colour language for the reservation lifecycle
const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  checked_in: 'bg-sky-100 text-sky-800',
  completed: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-violet-100 text-violet-800'
}

export default function ReservationStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        STATUS_STYLES[status] || STATUS_STYLES.pending
      }`}
    >
      {reservationStatusLabel(status)}
    </span>
  )
}

const PAYMENT_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  refunded: 'bg-sky-100 text-sky-800',
  failed: 'bg-red-100 text-red-700'
}

const PAYMENT_LABELS = {
  pending: 'Payment pending',
  paid: 'Paid',
  refunded: 'Refunded',
  failed: 'Payment failed'
}

export function PaymentStatusBadge({ status }) {
  if (!status) return null

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        PAYMENT_STYLES[status] || PAYMENT_STYLES.pending
      }`}
    >
      {PAYMENT_LABELS[status] || status}
    </span>
  )
}
