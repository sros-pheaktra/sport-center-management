import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { isStaffSide } from '../utils/roles'

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@sportcenter.test', password: 'Admin1234!' },
  { label: 'Manager', email: 'manager@sportcenter.test', password: 'Manager1234!' },
  { label: 'Staff', email: 'staff@sportcenter.test', password: 'Staff1234!' },
  { label: 'Customer', email: 'demo@sportcenter.test', password: 'Demo1234!' }
]

export default function LoginPage() {
  const { login } = useAuth()
  const { success } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from

  const [form, setForm] = useState({ email: '', password: '' })
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    const errors = {}
    if (!form.email.trim()) errors.email = 'Email is required.'
    if (!form.password) errors.password = 'Password is required.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setBusy(true)
    try {
      const data = await login(form)
      success(`Welcome back, ${data.user.full_name.split(' ')[0]}!`)

      // Staff-side roles land on the dashboard; everyone else on
      // the facility browser (or wherever they were heading)
      const target = from || (isStaffSide(data.user) ? '/dashboard' : '/')
      navigate(target)
    } catch (err) {
      setFormError(err.message || 'Login failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Log in</h1>
        <p className="mt-1 text-sm text-slate-600">
          Welcome back! Log in to manage the sport center or your bookings.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          {formError && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="you@example.com"
              className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                fieldErrors.email
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                  : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
              }`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                fieldErrors.password
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                  : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
              }`}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          No account yet?{' '}
          <Link to="/register" className="font-medium text-emerald-700 hover:underline">
            Register here
          </Link>
        </p>
      </div>

      <div className="mt-4 rounded-md bg-slate-100 px-4 py-3">
        <p className="text-center text-xs font-semibold text-slate-500">Demo accounts</p>
        <ul className="mt-2 space-y-1 text-center text-xs text-slate-500">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <span className="font-medium text-slate-600">{account.label}:</span>{' '}
              {account.email} / {account.password}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
