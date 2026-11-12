import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import Loading from '../components/Loading'
import ReservationStatusBadge, { PaymentStatusBadge } from '../components/ReservationStatusBadge'
import { InvoiceStatusBadge } from '../components/Phase3Badges'
import { formatPrice } from '../utils/format'
import { formatBookingDate, formatBookingRange, formatBookingTime } from '../utils/reservation'
import { canManageBookings } from '../utils/roles'

const PAYMENT_METHOD_LABELS = {
  online: 'Online payment',
  at_center: 'Pay at the center'
}

export default function BookingDetailPage() {
  const { reference } = useParams()

  return <BookingDetail key={reference} reference={reference} />
}

function BookingDetail({ reference }) {
  const { user } = useAuth()
  const { success, error } = useToast()

  const [reservation, setReservation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [now, setNow] = useState(0)

  useEffect(() => {
    let active = true

    api(`/reservations/${reference}`)
      .then((data) => {
        if (!active) return
        setReservation(data.reservation)
        setNow(Date.now())
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        if (err.status === 404) setNotFound(true)
        else if (err.status === 403) setLoadError('You do not have permission to view this booking.')
        else setLoadError('Could not load this booking. Please try again.')
        setLoading(false)
      })

    return () => { active = false }
  }, [reference])

  const runAction = async (action, path, body, fallbackMessage) => {
    setBusyAction(action)
    try {
      const data = await api(path, { method: 'POST', body })
      setReservation(data.reservation)
      success(data.message || fallbackMessage)
    } catch (err) {
      error(err.message || 'Could not update this booking.')
    } finally {
      setBusyAction('')
      setCancelOpen(false)
    }
  }

  if (loading) {
    return <Loading label="Loading booking…" />
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-800">Booking not found</h1>
        <p className="mt-2 text-slate-600">
          Check the reference in your confirmation email or open it from your bookings list.
        </p>
        <Link to="/bookings" className="mt-6 inline-block text-sm font-medium text-emerald-700 hover:underline">
          ← Back to bookings
        </Link>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-red-700">{loadError}</p>
        <Link to="/bookings" className="mt-6 inline-block text-sm font-medium text-emerald-700 hover:underline">
          ← Back to bookings
        </Link>
      </div>
    )
  }

  const isOwner = reservation.user_id === user.id
  const staff = canManageBookings(user)
  const status = reservation.status
  const startsInFuture = new Date(reservation.starts_at).getTime() > now
  const startPassed = !startsInFuture
  const isActive = ['pending', 'confirmed'].includes(status)

  const canCancel = isActive && (staff || (isOwner && startsInFuture))
  const canPay = isOwner && reservation.payment_status === 'pending' && !['cancelled', 'completed', 'no_show'].includes(status)

  const canConfirm = staff && status === 'pending'
  const canCheckIn = staff && isActive
  const canComplete = staff && status === 'checked_in'
  const canNoShow = staff && isActive && startPassed

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/bookings" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Back to bookings
      </Link>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Booking</p>
            <h1 className="mt-1 font-mono text-2xl font-bold text-slate-900">{reservation.reference}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ReservationStatusBadge status={status} />
            <PaymentStatusBadge status={reservation.payment_status} />
          </div>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Session</h2>
            <div className="mt-3 space-y-2 text-sm">
              <p>
                <Link
                  to={`/facilities/${reservation.facility_id}`}
                  className="text-lg font-semibold text-slate-900 hover:text-emerald-700"
                >
                  {reservation.facility_title}
                </Link>
                <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                  {reservation.category_name}
                </span>
              </p>
              <p className="text-slate-700">{formatBookingDate(reservation.starts_at)}</p>
              <p className="text-slate-700">
                {formatBookingTime(reservation.starts_at)}–{formatBookingTime(reservation.ends_at)}
              </p>
              <p className="text-slate-500">
                {formatBookingRange(reservation.starts_at, reservation.ends_at)}
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Payment</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="text-slate-800">{formatPrice(reservation.subtotal)}</dd>
              </div>
              {Number(reservation.discount_amount) > 0 && (
                <div className="flex justify-between gap-3 text-emerald-700">
                  <dt>Membership discount</dt>
                  <dd className="font-medium">−{formatPrice(reservation.discount_amount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Total</dt>
                <dd className="font-semibold text-slate-900">{formatPrice(reservation.total_price)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Method</dt>
                <dd className="text-slate-800">
                  {PAYMENT_METHOD_LABELS[reservation.payment_method] || '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Status</dt>
                <dd><PaymentStatusBadge status={reservation.payment_status} /></dd>
              </div>
              {reservation.invoice_id && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Invoice</dt>
                  <dd className="flex flex-wrap items-center justify-end gap-2">
                    <Link
                      to={`/invoices/${reservation.invoice_id}`}
                      className="font-mono text-xs font-medium text-emerald-700 hover:underline"
                    >
                      {reservation.invoice_number}
                    </Link>
                    <InvoiceStatusBadge status={reservation.invoice_status} />
                  </dd>
                </div>
              )}
              {reservation.payment_reference && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Transaction</dt>
                  <dd className="font-mono text-xs text-slate-600">{reservation.payment_reference}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Check-in code
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-slate-900">
                  {reservation.checkin_code}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Show this code at the front desk when you arrive.
                </p>
              </div>
              <span className="text-4xl" aria-hidden="true">🎟️</span>
            </div>
          </section>

          {staff && (
            <section className="md:col-span-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Customer</h2>
              <p className="mt-2 text-sm text-slate-700">
                {reservation.customer_name}{' '}
                <span className="text-slate-500">({reservation.customer_email})</span>
              </p>
            </section>
          )}

          {reservation.notes && (
            <section className="md:col-span-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Notes</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{reservation.notes}</p>
            </section>
          )}

          {reservation.cancellation_reason && (
            <section className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 p-4">
              <h2 className="text-sm font-semibold text-red-800">Cancellation reason</h2>
              <p className="mt-1 text-sm text-red-700">{reservation.cancellation_reason}</p>
            </section>
          )}
        </div>

        {(canPay || canCancel || canConfirm || canCheckIn || canComplete || canNoShow) && (
          <div className="flex flex-wrap gap-3 border-t border-slate-100 p-6">
            {canPay && (
              <button
                type="button"
                disabled={busyAction !== ''}
                onClick={() => runAction('pay', `/reservations/${reservation.id}/pay`, undefined, 'Payment successful')}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {busyAction === 'pay' ? 'Processing…' : `Pay ${formatPrice(reservation.total_price)} online`}
              </button>
            )}

            {canConfirm && (
              <button
                type="button"
                disabled={busyAction !== ''}
                onClick={() => runAction('confirm', `/reservations/${reservation.id}/confirm`, undefined, 'Booking confirmed')}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {busyAction === 'confirm' ? 'Confirming…' : 'Confirm booking'}
              </button>
            )}

            {canCheckIn && (
              <button
                type="button"
                disabled={busyAction !== ''}
                onClick={() => runAction('check-in', `/reservations/${reservation.id}/check-in`, undefined, 'Customer checked in')}
                className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {busyAction === 'check-in' ? 'Checking in…' : 'Check in customer'}
              </button>
            )}

            {canComplete && (
              <button
                type="button"
                disabled={busyAction !== ''}
                onClick={() => runAction('complete', `/reservations/${reservation.id}/complete`, undefined, 'Booking completed')}
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
              >
                {busyAction === 'complete' ? 'Completing…' : 'Complete booking'}
              </button>
            )}

            {canNoShow && (
              <button
                type="button"
                disabled={busyAction !== ''}
                onClick={() => runAction('no-show', `/reservations/${reservation.id}/no-show`, undefined, 'Booking marked as no-show')}
                className="rounded-md border border-violet-300 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-60"
              >
                {busyAction === 'no-show' ? 'Saving…' : 'Mark no-show'}
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                disabled={busyAction !== ''}
                onClick={() => setCancelOpen(true)}
                className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                Cancel booking
              </button>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this booking?"
        message={
          reservation.payment_status === 'paid'
            ? 'The booking will be cancelled and the payment refunded.'
            : 'The slot will be released for other customers.'
        }
        confirmLabel="Cancel booking"
        busy={busyAction === 'cancel'}
        onConfirm={() =>
          runAction(
            'cancel',
            `/reservations/${reservation.id}/cancel`,
            { reason: 'Cancelled from the booking page' },
            'Booking cancelled'
          )
        }
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  )
}
