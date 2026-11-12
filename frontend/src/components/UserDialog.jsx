import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

// Modal for creating or editing an account (user & staff management).
// Managers may only create/edit staff accounts; only admins can
// change roles or deactivate accounts. The server re-checks all of it.
export default function UserDialog({ user, onClose, onSaved }) {
  const { user: currentUser } = useAuth()
  const isEdit = Boolean(user)
  const isSelf = isEdit && user.id === currentUser.id
  const adminEditor = currentUser.role === 'admin'

  const [form, setForm] = useState(() => (
    isEdit
      ? {
          full_name: user.full_name,
          email: user.email,
          phone: user.phone || '',
          role: user.role,
          password: '',
          is_active: user.is_active
        }
      : {
          full_name: '',
          email: '',
          phone: '',
          role: currentUser.role === 'manager' ? 'staff' : 'customer',
          password: '',
          is_active: true
        }
  ))
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Escape closes the dialog
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const validate = () => {
    const errors = {}

    if (form.full_name.trim().length < 2) errors.full_name = 'Name must be at least 2 characters.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.'

    const password = form.password || ''
    if (!isEdit && password.length < 8) {
      errors.password = 'Password must be at least 8 characters.'
    } else if (isEdit && password && password.length < 8) {
      errors.password = 'Password must be at least 8 characters (leave blank to keep the current one).'
    }

    return errors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const body = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim()
    }

    if (!isEdit) {
      body.role = form.role
      body.password = form.password
    } else {
      if (adminEditor) body.role = form.role
      if (adminEditor && !isSelf) body.is_active = form.is_active
      if (form.password) body.password = form.password
    }

    setSaving(true)
    try {
      const data = isEdit
        ? await api(`/users/${user.id}`, { method: 'PUT', body })
        : await api('/users', { method: 'POST', body })

      onSaved(data.user, isEdit)
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (field) =>
    `mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
      fieldErrors[field]
        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
        : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
    }`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-dialog-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="user-dialog-title" className="text-lg font-semibold text-slate-900">
          {isEdit ? `Edit ${user.full_name}` : 'New account'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isEdit
            ? 'Update the account details below.'
            : 'Create a staff or customer account with a starting password.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
          {formError && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="user-full-name" className="block text-sm font-medium text-slate-700">
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              id="user-full-name"
              type="text"
              maxLength={100}
              value={form.full_name}
              onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              className={inputClass('full_name')}
            />
            {fieldErrors.full_name && <p className="mt-1 text-sm text-red-600">{fieldErrors.full_name}</p>}
          </div>

          <div>
            <label htmlFor="user-email" className="block text-sm font-medium text-slate-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="user-email"
              type="email"
              maxLength={150}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className={inputClass('email')}
            />
            {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="user-phone" className="block text-sm font-medium text-slate-700">
              Phone <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="user-phone"
              type="tel"
              maxLength={30}
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="+1 555-0100"
              className={inputClass('phone')}
            />
          </div>

          <div>
            <label htmlFor="user-role" className="block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              id="user-role"
              value={form.role}
              disabled={isEdit ? !adminEditor : currentUser.role === 'manager'}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {(currentUser.role === 'manager'
                ? [{ value: 'staff', label: 'Staff' }]
                : [
                    { value: 'customer', label: 'Customer' },
                    { value: 'staff', label: 'Staff' },
                    { value: 'manager', label: 'Manager' },
                    { value: 'admin', label: 'Admin' }
                  ]
              ).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {isEdit && isSelf && (
              <p className="mt-1 text-xs text-slate-500">You cannot change your own role.</p>
            )}
          </div>

          <div>
            <label htmlFor="user-password" className="block text-sm font-medium text-slate-700">
              {isEdit ? 'New password ' : 'Password '}
              {isEdit && <span className="text-slate-400">(leave blank to keep the current one)</span>}
            </label>
            <input
              id="user-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="At least 8 characters"
              className={inputClass('password')}
            />
            {fieldErrors.password && <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>}
          </div>

          {adminEditor && isEdit && !isSelf && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Account is active (deactivated accounts cannot log in)
            </label>
          )}

          <div className="mt-2 flex justify-end gap-3 border-t border-slate-100 pt-4">
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
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
