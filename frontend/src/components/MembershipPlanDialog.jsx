import { useState } from 'react'
import { api } from '../api'

// Create/edit dialog for membership plans (admin & manager only).
export default function MembershipPlanDialog({ plan, onClose, onSaved }) {
  const isEdit = Boolean(plan)

  const [form, setForm] = useState(() => (
    isEdit
      ? {
          name: plan.name,
          description: plan.description || '',
          price: String(plan.price),
          duration_months: String(plan.duration_months),
          booking_discount_percent: String(Number(plan.booking_discount_percent)),
          is_active: Boolean(plan.is_active)
        }
      : {
          name: '',
          description: '',
          price: '29.99',
          duration_months: '1',
          booking_discount_percent: '5',
          is_active: true
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
      price: Number(form.price),
      duration_months: Number(form.duration_months),
      booking_discount_percent: Number(form.booking_discount_percent),
      is_active: form.is_active
    }

    if (body.name.length < 3) {
      setFormError('Plan name must be at least 3 characters.')
      return
    }

    if (!Number.isFinite(body.price) || body.price <= 0) {
      setFormError('Please enter a price greater than zero.')
      return
    }

    setSaving(true)
    try {
      const data = isEdit
        ? await api(`/membership-plans/${plan.id}`, { method: 'PUT', body })
        : await api('/membership-plans', { method: 'POST', body })

      onSaved(data.plan, isEdit)
    } catch (err) {
      setFormError(err.message || 'Could not save this plan. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-dialog-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="plan-dialog-title" className="text-lg font-semibold text-slate-900">
          {isEdit ? `Edit ${plan.name}` : 'New membership plan'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          The booking discount applies automatically to new bookings while a membership is active.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
          {formError && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="plan-name" className="block text-sm font-medium text-slate-700">
              Plan name <span className="text-red-500">*</span>
            </label>
            <input
              id="plan-name"
              type="text"
              maxLength={100}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="plan-description" className="block text-sm font-medium text-slate-700">
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              id="plan-description"
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="plan-price" className="block text-sm font-medium text-slate-700">
                Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                id="plan-price"
                type="number"
                min="0.01"
                max="10000"
                step="0.01"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="plan-duration" className="block text-sm font-medium text-slate-700">
                Duration (months)
              </label>
              <input
                id="plan-duration"
                type="number"
                min="1"
                max="24"
                step="1"
                value={form.duration_months}
                onChange={(event) => setForm({ ...form, duration_months: event.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="plan-discount" className="block text-sm font-medium text-slate-700">
              Booking discount (%)
            </label>
            <input
              id="plan-discount"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.booking_discount_percent}
              onChange={(event) =>
                setForm({ ...form, booking_discount_percent: event.target.value })
              }
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
            Plan is available for new subscriptions
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
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
