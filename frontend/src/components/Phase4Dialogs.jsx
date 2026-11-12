import { useEffect, useState } from 'react'
import { api } from '../api'
import { formatPrice } from '../utils/format'
import { todayInputValue, shiftDateInput } from '../utils/reservation'

const inputClass =
  'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200'

const overlayClass =
  'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4'

function DialogShell({ title, subtitle, labelledBy, onClose, children }) {
  return (
    <div className={overlayClass} onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={labelledBy} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

// Create/edit dialog for equipment (admin & manager only).
export function EquipmentDialog({ item, onClose, onSaved }) {
  const isEdit = Boolean(item)

  const [form, setForm] = useState(() => (
    isEdit
      ? {
          name: item.name,
          description: item.description || '',
          item_condition: item.item_condition,
          status: item.status,
          rental_fee: String(Number(item.rental_fee))
        }
      : {
          name: '',
          description: '',
          item_condition: 'good',
          status: 'available',
          rental_fee: '5.00'
        }
  ))

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      item_condition: form.item_condition,
      status: form.status,
      rental_fee: Number(form.rental_fee)
    }

    if (body.name.length < 2) {
      setFormError('Equipment name must be at least 2 characters.')
      return
    }

    if (!Number.isFinite(body.rental_fee) || body.rental_fee < 0) {
      setFormError('Please enter a daily rental fee of zero or more.')
      return
    }

    setSaving(true)
    try {
      const data = isEdit
        ? await api(`/equipment/${item.id}`, { method: 'PUT', body })
        : await api('/equipment', { method: 'POST', body })

      onSaved(data.equipment, isEdit)
    } catch (err) {
      setFormError(err.message || 'Could not save this item. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogShell
      title={isEdit ? `Edit ${item.name}` : 'New equipment item'}
      subtitle="Customers can rent available items by the day."
      labelledBy="equipment-dialog-title"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
        {formError && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div>
          <label htmlFor="equipment-name" className="block text-sm font-medium text-slate-700">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="equipment-name"
            type="text"
            maxLength={100}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="equipment-description" className="block text-sm font-medium text-slate-700">
            Description <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="equipment-description"
            rows={3}
            maxLength={500}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className={inputClass}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="equipment-condition" className="block text-sm font-medium text-slate-700">
              Condition
            </label>
            <select
              id="equipment-condition"
              value={form.item_condition}
              onChange={(event) => setForm({ ...form, item_condition: event.target.value })}
              className={inputClass}
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>

          <div>
            <label htmlFor="equipment-status" className="block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              id="equipment-status"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              className={inputClass}
            >
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="equipment-fee" className="block text-sm font-medium text-slate-700">
            Daily rental fee ($) <span className="text-red-500">*</span>
          </label>
          <input
            id="equipment-fee"
            type="number"
            min="0"
            max="9999.99"
            step="0.01"
            value={form.rental_fee}
            onChange={(event) => setForm({ ...form, rental_fee: event.target.value })}
            className={inputClass}
          />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add item'}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}

// Customer dialog: choose how many days and optionally attach a booking.
export function RentEquipmentDialog({ item, onClose, onRented }) {
  const [days, setDays] = useState('1')
  const [reservationId, setReservationId] = useState('')
  const [bookings, setBookings] = useState([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    let active = true

    api('/reservations')
      .then((data) => {
        if (!active) return
        setBookings(
          data.reservations.filter((row) =>
            ['pending', 'confirmed'].includes(row.status)
          )
        )
      })
      .catch(() => {})

    return () => { active = false }
  }, [])

  const daysNumber = Number.parseInt(days, 10)
  const fee = Number(item.rental_fee) * (Number.isFinite(daysNumber) ? daysNumber : 0)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!Number.isInteger(daysNumber) || daysNumber < 1 || daysNumber > 30) {
      setFormError('Please choose between 1 and 30 rental days.')
      return
    }

    setSaving(true)
    try {
      const data = await api(`/equipment/${item.id}/rent`, {
        method: 'POST',
        body: {
          days: daysNumber,
          reservation_id: reservationId || undefined
        }
      })

      onRented(data.rental, data.message)
    } catch (err) {
      setFormError(err.message || 'Could not rent this item. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogShell
      title={`Rent ${item.name}`}
      subtitle={`${formatPrice(item.rental_fee)} per day · return it at the front desk.`}
      labelledBy="rent-dialog-title"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
        {formError && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div>
          <label htmlFor="rent-days" className="block text-sm font-medium text-slate-700">
            Rental days
          </label>
          <input
            id="rent-days"
            type="number"
            min="1"
            max="30"
            step="1"
            value={days}
            onChange={(event) => setDays(event.target.value)}
            className={inputClass}
          />
        </div>

        {bookings.length > 0 && (
          <div>
            <label htmlFor="rent-booking" className="block text-sm font-medium text-slate-700">
              Attach to a booking <span className="text-slate-400">(optional)</span>
            </label>
            <select
              id="rent-booking"
              value={reservationId}
              onChange={(event) => setReservationId(event.target.value)}
              className={inputClass}
            >
              <option value="">No booking</option>
              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.reference} · {booking.facility_title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-500">Total rental fee</span>
          <span className="text-lg font-bold text-slate-900">{formatPrice(fee)}</span>
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? 'Renting…' : 'Confirm rental'}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}

// Create/edit dialog for promotion codes (admin & manager only).
export function PromotionDialog({ promotion, onClose, onSaved }) {
  const isEdit = Boolean(promotion)

  const [form, setForm] = useState(() => (
    isEdit
      ? {
          code: promotion.code,
          title: promotion.title,
          description: promotion.description || '',
          discount_type: promotion.discount_type,
          discount_value: String(Number(promotion.discount_value)),
          valid_from: String(promotion.valid_from).slice(0, 10),
          valid_until: String(promotion.valid_until).slice(0, 10),
          usage_limit: promotion.usage_limit === null ? '' : String(promotion.usage_limit),
          is_active: Boolean(promotion.is_active)
        }
      : {
          code: '',
          title: '',
          description: '',
          discount_type: 'percent',
          discount_value: '10',
          valid_from: todayInputValue(),
          valid_until: shiftDateInput(todayInputValue(), 30),
          usage_limit: '100',
          is_active: true
        }
  ))

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    const body = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      valid_from: form.valid_from,
      valid_until: form.valid_until,
      usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
      is_active: form.is_active
    }

    if (body.code.length < 3) {
      setFormError('Code must be at least 3 characters.')
      return
    }

    if (body.title.length < 3) {
      setFormError('Title must be at least 3 characters.')
      return
    }

    if (!Number.isFinite(body.discount_value) || body.discount_value <= 0) {
      setFormError('Discount value must be greater than zero.')
      return
    }

    if (!body.valid_from || !body.valid_until || body.valid_until < body.valid_from) {
      setFormError('The end date must be on or after the start date.')
      return
    }

    setSaving(true)
    try {
      const data = isEdit
        ? await api(`/promotions/${promotion.id}`, { method: 'PUT', body })
        : await api('/promotions', { method: 'POST', body })

      onSaved(data.promotion, isEdit)
    } catch (err) {
      setFormError(err.message || 'Could not save this promotion. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogShell
      title={isEdit ? `Edit ${promotion.code}` : 'New promotion code'}
      subtitle="The code is applied after any membership discount at checkout."
      labelledBy="promotion-dialog-title"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
        {formError && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="promo-code" className="block text-sm font-medium text-slate-700">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              id="promo-code"
              type="text"
              maxLength={30}
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
              className={inputClass}
              placeholder="SUMMER10"
            />
          </div>

          <div>
            <label htmlFor="promo-title" className="block text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="promo-title"
              type="text"
              maxLength={150}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="promo-description" className="block text-sm font-medium text-slate-700">
            Description <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="promo-description"
            rows={2}
            maxLength={500}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className={inputClass}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="promo-type" className="block text-sm font-medium text-slate-700">
              Discount type
            </label>
            <select
              id="promo-type"
              value={form.discount_type}
              onChange={(event) => setForm({ ...form, discount_type: event.target.value })}
              className={inputClass}
            >
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed amount ($)</option>
            </select>
          </div>

          <div>
            <label htmlFor="promo-value" className="block text-sm font-medium text-slate-700">
              Discount value <span className="text-red-500">*</span>
            </label>
            <input
              id="promo-value"
              type="number"
              min="0.01"
              step="0.01"
              value={form.discount_value}
              onChange={(event) => setForm({ ...form, discount_value: event.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="promo-from" className="block text-sm font-medium text-slate-700">
              Valid from
            </label>
            <input
              id="promo-from"
              type="date"
              value={form.valid_from}
              onChange={(event) => setForm({ ...form, valid_from: event.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="promo-until" className="block text-sm font-medium text-slate-700">
              Valid until
            </label>
            <input
              id="promo-until"
              type="date"
              value={form.valid_until}
              min={form.valid_from}
              onChange={(event) => setForm({ ...form, valid_until: event.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="promo-limit" className="block text-sm font-medium text-slate-700">
            Usage limit <span className="text-slate-400">(blank for unlimited)</span>
          </label>
          <input
            id="promo-limit"
            type="number"
            min="1"
            step="1"
            value={form.usage_limit}
            onChange={(event) => setForm({ ...form, usage_limit: event.target.value })}
            className={inputClass}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Code can be redeemed
        </label>

        <div className="mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create code'}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}
