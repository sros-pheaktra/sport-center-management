import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
import ReservationStatusBadge, { PaymentStatusBadge } from '../components/ReservationStatusBadge'
import { formatPrice } from '../utils/format'
import {
  formatBookingDate,
  formatBookingRange,
  formatBookingTime
} from '../utils/reservation'

// Front-desk check-in: staff type (or paste) the code from the
// customer's confirmation and the booking is checked in. Any
// outstanding at-center payment is settled by the same request.
export default function CheckInPage() {
  const { success, error } = useToast()

  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [checkedIn, setCheckedIn] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    const trimmed = code.trim().toUpperCase()

    if (!trimmed) {
      setFormError('Please enter the customer’s check-in code.')
      return
    }

    setSubmitting(true)
    try {
      const data = await api(
        `/reservations/check-in/${encodeURIComponent(trimmed)}`,
        { method: 'POST' }
      )
      setCheckedIn(data.reservation)
      setCode('')
      success(data.message || 'Customer checked in.')
    } catch (err) {
      setCheckedIn(null)
      setFormError(
        err.status === 404
          ? 'No booking matches that check-in code. Check the code and try again.'
          : err.message || 'Could not check in this booking.'
      )
      error(err.message || 'Could not check in this booking.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Check in a customer</h1>
        <p className="mt-1 text-slate-600">
          Enter the code shown on the customer’s booking confirmation. Any
          at-center payment is recorded automatically when you check them in.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        noValidate
      >
        <label htmlFor="checkin-code" className="block text-sm font-medium text-slate-700">
          Check-in code
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="checkin-code"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={40}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="CHK100001"
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-lg tracking-wider focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <button
            type="submit"
            disabled={submitting}
            className="shrink-0 rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? 'Checking in…' : 'Check in'}
          </button>
        </div>

        {formError && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {formError}
          </div>
        )}

        <p className="mt-4 text-xs text-slate-500">
          The code is case-insensitive. Customers can find it on their booking
          page under “Check-in code”.
        </p>
      </form>

      {checkedIn && (
        <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Checked in
              </p>
              <h2 className="mt-1 font-mono text-2xl font-bold text-slate-900">
                {checkedIn.reference}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ReservationStatusBadge status={checkedIn.status} />
              <PaymentStatusBadge status={checkedIn.payment_status} />
            </div>
          </div>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Customer</dt>
              <dd className="font-medium text-slate-900">
                {checkedIn.customer_name}
                {checkedIn.customer_email && (
                  <span className="block text-xs font-normal text-slate-500">
                    {checkedIn.customer_email}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Facility</dt>
              <dd className="font-medium text-slate-900">{checkedIn.facility_title}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Date</dt>
              <dd className="font-medium text-slate-900">
                {formatBookingDate(checkedIn.starts_at)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Time</dt>
              <dd className="font-medium text-slate-900">
                {formatBookingTime(checkedIn.starts_at)}–{formatBookingTime(checkedIn.ends_at)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Total</dt>
              <dd className="font-medium text-slate-900">
                {formatPrice(checkedIn.total_price)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Payment</dt>
              <dd className="font-medium text-slate-900">
                {checkedIn.payment_method === 'online'
                  ? 'Paid online'
                  : checkedIn.payment_status === 'paid'
                    ? 'Paid at the center'
                    : 'Payment pending'}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-xs text-slate-600">
            {formatBookingRange(checkedIn.starts_at, checkedIn.ends_at)}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to={`/bookings/${checkedIn.reference}`}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Open booking
            </Link>
            <button
              type="button"
              onClick={() => setCheckedIn(null)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Check in someone else
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
