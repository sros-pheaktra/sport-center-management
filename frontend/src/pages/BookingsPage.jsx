import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/Loading'
import ReservationStatusBadge, { PaymentStatusBadge } from '../components/ReservationStatusBadge'
import { formatPrice } from '../utils/format'
import { formatBookingRange, RESERVATION_STATUSES } from '../utils/reservation'
import { canViewAllBookings } from '../utils/roles'

// Customers see their own bookings; staff-side roles see every booking
// with filters and a "only mine" toggle.
export default function BookingsPage() {
  const { user } = useAuth()
  const staff = canViewAllBookings(user)

  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')
  const [facilityId, setFacilityId] = useState('')
  const [mine, setMine] = useState(false)
  const [facilities, setFacilities] = useState([])

  useEffect(() => {
    let active = true

    api('/facilities')
      .then((data) => { if (active) setFacilities(data.facilities) })
      .catch(() => {})

    return () => { active = false }
  }, [])

  const hasFilters = status || date || facilityId || mine

  const clearFilters = () => {
    setStatus('')
    setDate('')
    setFacilityId('')
    setMine(false)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {staff ? 'Bookings' : 'My bookings'}
          </h1>
          <p className="mt-1 text-slate-600">
            {staff
              ? 'Every reservation in the center — confirm, check in or complete them.'
              : 'Your upcoming and past reservations, with payment and check-in details.'}
          </p>
        </div>
        <Link
          to="/"
          className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Book a facility
        </Link>
      </div>

      <div className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="booking-status-filter" className="block text-xs font-medium text-slate-500">
            Status
          </label>
          <select
            id="booking-status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Any status</option>
            {RESERVATION_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="booking-date-filter" className="block text-xs font-medium text-slate-500">
            Date
          </label>
          <input
            id="booking-date-filter"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label htmlFor="booking-facility-filter" className="block text-xs font-medium text-slate-500">
            Facility
          </label>
          <select
            id="booking-facility-filter"
            value={facilityId}
            onChange={(event) => setFacilityId(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">All facilities</option>
            {facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>{facility.title}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          {staff && (
            <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={mine}
                onChange={(event) => setMine(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Only mine
            </label>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <BookingResults
        key={`${status}|${date}|${facilityId}|${mine}`}
        status={status}
        date={date}
        facilityId={facilityId}
        mine={mine}
        staff={staff}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
      />
    </div>
  )
}

function BookingResults({ status, date, facilityId, mine, staff, hasFilters, onClearFilters }) {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (date) params.set('date', date)
    if (facilityId) params.set('facility_id', facilityId)
    if (mine) params.set('mine', '1')

    const query = params.toString()

    api(`/reservations${query ? `?${query}` : ''}`)
      .then((data) => {
        if (!active) return
        setReservations(data.reservations)
        setError('')
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('Could not load bookings. Please try again.')
        setLoading(false)
      })

    return () => { active = false }
  }, [status, date, facilityId, mine])

  if (loading) {
    return <Loading label="Loading bookings…" />
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    )
  }

  if (reservations.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-lg font-semibold text-slate-800">No bookings found</p>
        <p className="mt-1 text-sm text-slate-600">
          {hasFilters
            ? 'Nothing matches these filters. Try clearing them.'
            : staff
              ? 'No reservations have been made yet.'
              : 'You have not booked a facility yet.'}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          {hasFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Clear filters
            </button>
          )}
          <Link
            to="/"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Browse facilities
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <p className="mb-3 text-sm text-slate-500">
        {reservations.length} {reservations.length === 1 ? 'booking' : 'bookings'}
        {hasFilters ? ' matching the filters' : ''}
      </p>

      <div className="space-y-3">
        {reservations.map((reservation) => (
          <Link
            key={reservation.id}
            to={`/bookings/${reservation.reference}`}
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-500">
                    {reservation.reference}
                  </span>
                  <ReservationStatusBadge status={reservation.status} />
                  <PaymentStatusBadge status={reservation.payment_status} />
                </div>
                <p className="mt-1.5 font-semibold text-slate-900">
                  {reservation.facility_title}
                </p>
                <p className="text-sm text-slate-600">
                  {formatBookingRange(reservation.starts_at, reservation.ends_at)}
                </p>
                {staff && (
                  <p className="mt-1 text-xs text-slate-500">
                    Customer: {reservation.customer_name}
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">
                  {formatPrice(reservation.total_price)}
                </p>
                <p className="text-xs text-slate-500">
                  {reservation.payment_method === 'online' ? 'Online' : 'At the center'}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
