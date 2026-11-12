import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import Loading from '../components/Loading'
import ReservationStatusBadge from '../components/ReservationStatusBadge'
import {
  formatBookingDate,
  formatBookingTime,
  localDateKey,
  mondayOf,
  shiftDateInput,
  todayInputValue
} from '../utils/reservation'

// Staff week view: one column per day for the chosen facility.
export default function CalendarPage() {
  const [facilities, setFacilities] = useState([])
  const [facilityId, setFacilityId] = useState('')
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayInputValue()))

  useEffect(() => {
    let active = true

    api('/facilities')
      .then((data) => { if (active) setFacilities(data.facilities) })
      .catch(() => {})

    return () => { active = false }
  }, [])

  const days = Array.from({ length: 7 }, (_, index) => shiftDateInput(weekStart, index))
  const weekEnd = shiftDateInput(weekStart, 6)
  const thisWeek = mondayOf(todayInputValue())

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Booking calendar</h1>
          <p className="mt-1 text-slate-600">
            {formatBookingDate(`${weekStart}T00:00:00`)} – {formatBookingDate(`${weekEnd}T00:00:00`)}
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Facility
          <select
            value={facilityId}
            onChange={(event) => setFacilityId(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">All facilities</option>
            {facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>{facility.title}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setWeekStart(shiftDateInput(weekStart, -7))}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          ← Previous week
        </button>
        <button
          type="button"
          onClick={() => setWeekStart(thisWeek)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          This week
        </button>
        <button
          type="button"
          onClick={() => setWeekStart(shiftDateInput(weekStart, 7))}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Next week →
        </button>
        <span className="ml-auto text-xs text-slate-500">
          Click any booking to open it and run staff actions.
        </span>
      </div>

      <WeekGrid
        key={`${facilityId}|${weekStart}`}
        facilityId={facilityId}
        weekStart={weekStart}
        days={days}
      />
    </div>
  )
}

function WeekGrid({ facilityId, weekStart, days }) {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const params = new URLSearchParams()
    params.set('from', weekStart)
    params.set('to', shiftDateInput(weekStart, 7))
    if (facilityId) params.set('facility_id', facilityId)

    api(`/reservations?${params.toString()}`)
      .then((data) => {
        if (!active) return
        setReservations(data.reservations)
        setError('')
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('Could not load the calendar. Please try again.')
        setLoading(false)
      })

    return () => { active = false }
  }, [facilityId, weekStart])

  if (loading) {
    return <Loading label="Loading calendar…" />
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    )
  }

  const grouped = {}
  reservations.forEach((reservation) => {
    const key = localDateKey(reservation.starts_at)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(reservation)
  })

  Object.values(grouped).forEach((list) => {
    list.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  })

  const today = todayInputValue()

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[900px] grid-cols-7 gap-3">
        {days.map((day) => {
          const date = new Date(`${day}T00:00:00`)
          const items = grouped[day] || []
          const isToday = day === today

          return (
            <div
              key={day}
              className={`rounded-xl border bg-white shadow-sm ${
                isToday ? 'border-emerald-400' : 'border-slate-200'
              }`}
            >
              <div className={`border-b p-2 text-center ${isToday ? 'bg-emerald-50' : ''}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {date.getDate()} {date.toLocaleDateString('en-GB', { month: 'short' })}
                </p>
              </div>

              <div className="min-h-32 space-y-2 p-2">
                {items.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">—</p>
                ) : (
                  items.map((reservation) => (
                    <Link
                      key={reservation.id}
                      to={`/bookings/${reservation.reference}`}
                      className={`block rounded-md border p-2 text-xs transition hover:shadow ${
                        reservation.status === 'cancelled'
                          ? 'border-slate-200 bg-slate-50 opacity-60'
                          : 'border-slate-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <p className="font-semibold text-slate-800">
                        {formatBookingTime(reservation.starts_at)}–{formatBookingTime(reservation.ends_at)}
                      </p>
                      <p className="mt-0.5 truncate font-medium text-slate-700">
                        {reservation.facility_title}
                      </p>
                      <p className="truncate text-slate-500">{reservation.customer_name}</p>
                      <div className="mt-1">
                        <ReservationStatusBadge status={reservation.status} />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
