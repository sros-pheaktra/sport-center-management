import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
import Loading from '../components/Loading'
import { formatPrice, formatTime } from '../utils/format'
import { todayInputValue } from '../utils/reservation'

// Customer booking flow: choose a date, pick an hourly slot, choose a
// duration and pay online or at the center.
export default function BookingPage() {
  const { id } = useParams()

  return <BookingFlow key={id} facilityId={id} />
}

function BookingFlow({ facilityId }) {
  const [facility, setFacility] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | missing | error
  const [date, setDate] = useState(todayInputValue())

  useEffect(() => {
    let active = true

    api(`/facilities/${facilityId}`)
      .then((data) => {
        if (!active) return
        setFacility(data.facility)
        setState('ready')
      })
      .catch((err) => {
        if (!active) return
        setState(err.status === 404 ? 'missing' : 'error')
      })

    return () => { active = false }
  }, [facilityId])

  if (state === 'loading') {
    return <Loading label="Loading booking form…" />
  }

  if (state === 'missing') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-800">Facility not found</h1>
        <p className="mt-2 text-slate-600">This facility may have been deleted.</p>
        <Link to="/" className="mt-6 inline-block text-sm font-medium text-blue-700 hover:underline">
          ← Back to all facilities
        </Link>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-red-700">
        Could not load this facility. Please try again.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        to={`/facilities/${facility.id}`}
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        ← Back to {facility.title}
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Book {facility.title}</h1>
          <p className="mt-1 text-slate-600">
            {facility.category_name} · {formatPrice(facility.price_per_hour)}/hour · open{' '}
            {formatTime(facility.open_time)}–{formatTime(facility.close_time)}
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Booking date
          <input
            type="date"
            value={date}
            min={todayInputValue()}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>
      </div>

      {facility.status !== 'available' && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This facility is currently{' '}
          {facility.status === 'maintenance' ? 'under maintenance' : 'unavailable'} and
          cannot be booked.
        </div>
      )}

      {/* The key gives the picker a fresh slot list whenever the date
          or facility changes */}
      <SlotPicker
        key={`${facility.id}|${date}`}
        facility={facility}
        date={date}
      />
    </div>
  )
}

function SlotPicker({ facility, date }) {
  const navigate = useNavigate()
  const { success } = useToast()

  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [membership, setMembership] = useState(null)

  const [selected, setSelected] = useState('')
  const [hours, setHours] = useState(1)
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('online')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Discounts are previewed here; the server recalculates them on save.
  useEffect(() => {
    let active = true

    api('/memberships/mine')
      .then((data) => { if (active) setMembership(data.membership) })
      .catch(() => {})

    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true

    api(`/facilities/${facility.id}/availability?date=${encodeURIComponent(date)}`)
      .then((data) => {
        if (!active) return
        setSlots(data.slots)
        setLoadError('')
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoadError('Could not load the availability for this date. Please try again.')
        setLoading(false)
      })

    return () => { active = false }
  }, [facility.id, date, reloadKey])

  const selectedIndex = slots.findIndex((slot) => slot.start === selected)

  // Consecutive free slots from the chosen start determine the
  // maximum bookable duration.
  let maxHours = 1
  if (selectedIndex >= 0) {
    maxHours = 0
    for (let index = selectedIndex; index < slots.length; index += 1) {
      if (!slots[index].available) break
      maxHours += 1
    }
    maxHours = Math.max(1, maxHours)
  }

  const safeHours = Math.min(hours, maxHours)
  const subtotal = Number(facility.price_per_hour) * safeHours
  const discountPercent = membership
    ? Number(membership.booking_discount_percent)
    : 0
  const discountAmount = Math.round(
    subtotal * (discountPercent / 100) * 100
  ) / 100
  const total = Math.max(0, subtotal - discountAmount)

  const chooseStart = (start) => {
    setSelected(start)
    setHours(1)
    setFormError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!selected) {
      setFormError('Please choose a start time.')
      return
    }

    setSubmitting(true)
    try {
      const data = await api('/reservations', {
        method: 'POST',
        body: {
          facility_id: facility.id,
          date,
          start_time: selected,
          hours: safeHours,
          notes,
          payment_method: paymentMethod
        }
      })

      success(data.message || 'Booking created.')
      navigate(`/bookings/${data.reservation.reference}`)
    } catch (err) {
      setFormError(err.message || 'Could not create the booking.')

      // A 409 means the slot was taken in the meantime — refresh the
      // grid so the customer can pick another one.
      if (err.status === 409) {
        setSelected('')
        setHours(1)
        setReloadKey((key) => key + 1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loading label="Loading available times…" />
  }

  if (loadError) {
    return (
      <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {loadError}
      </div>
    )
  }

  const freeSlots = slots.filter((slot) => slot.available).length

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Available start times</h2>
          <span className="text-xs text-slate-500">
            {freeSlots} of {slots.length} slots free
          </span>
        </div>

        {slots.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            This facility has no hourly slots on this date.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((slot) => {
              const isSelected = slot.start === selected
              const disabled = !slot.available

              return (
                <button
                  key={slot.start}
                  type="button"
                  disabled={disabled}
                  title={slot.reason || `Book ${slot.start}–${slot.end}`}
                  onClick={() => chooseStart(slot.start)}
                  className={`rounded-md border px-2 py-2 text-center text-sm transition ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : disabled
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <span className="block font-semibold">{slot.start}</span>
                  <span className={`block text-xs ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                    to {slot.end}
                  </span>
                  {disabled && (
                    <span className="mt-0.5 block text-[10px] leading-tight">{slot.reason}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Times already booked or in the past are greyed out. All times are center local time.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Booking summary</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="booking-hours" className="block text-sm font-medium text-slate-700">
              Duration
            </label>
            <select
              id="booking-hours"
              value={safeHours}
              onChange={(event) => setHours(Number(event.target.value))}
              disabled={!selected}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
            >
              {Array.from({ length: maxHours }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value} {value === 1 ? 'hour' : 'hours'}
                </option>
              ))}
            </select>
            {selected && (
              <p className="mt-1 text-xs text-slate-500">
                {selected}–{slots[selectedIndex + safeHours - 1]?.end || selected} · up to{' '}
                {maxHours} consecutive {maxHours === 1 ? 'hour' : 'hours'} available
              </p>
            )}
          </div>

          <div>
            <label htmlFor="booking-notes" className="block text-sm font-medium text-slate-700">
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="booking-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Anything the staff should know?"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Payment</legend>
            <div className="mt-2 space-y-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                <input
                  type="radio"
                  name="payment_method"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-slate-800">Pay online now</span>
                  <span className="block text-xs text-slate-500">
                    Simulated payment — the booking is confirmed instantly.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                <input
                  type="radio"
                  name="payment_method"
                  value="at_center"
                  checked={paymentMethod === 'at_center'}
                  onChange={() => setPaymentMethod('at_center')}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-slate-800">Pay at the center</span>
                  <span className="block text-xs text-slate-500">
                    Pay at the front desk when you arrive.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <dl className="space-y-1 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Price per hour</dt>
              <dd className="font-medium text-slate-800">{formatPrice(facility.price_per_hour)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Hours</dt>
              <dd className="font-medium text-slate-800">{safeHours}</dd>
            </div>
            {discountAmount > 0 && (
              <>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="font-medium text-slate-800">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <dt>
                    {membership.plan_name} ({discountPercent}% off)
                  </dt>
                  <dd className="font-medium">−{formatPrice(discountAmount)}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-bold text-slate-900">{formatPrice(total)}</dd>
            </div>
          </dl>

          {formError && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !selected || facility.status !== 'available'}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? 'Creating booking…'
              : paymentMethod === 'online'
                ? 'Confirm & pay online'
                : 'Confirm booking'}
          </button>

          <p className="text-center text-xs text-slate-500">
            You can cancel from the booking page before it starts.
          </p>
        </div>
      </section>
    </form>
  )
}
