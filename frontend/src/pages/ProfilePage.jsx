import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import RoleBadge from '../components/RoleBadge'

// My profile — every logged-in user can update their own name and
// phone number, and change their password. Role and email are
// managed by administrators.
export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const { success } = useToast()

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || ''
  })
  const [profileError, setProfileError] = useState('')
  const [profileFieldErrors, setProfileFieldErrors] = useState({})
  const [savingProfile, setSavingProfile] = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({})
  const [savingPassword, setSavingPassword] = useState(false)

  const inputClass = (invalid) =>
    `mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
      invalid
        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
        : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
    }`

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileError('')

    const errors = {}
    if (form.full_name.trim().length < 2) errors.full_name = 'Name must be at least 2 characters.'
    setProfileFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSavingProfile(true)
    try {
      const data = await api('/auth/profile', {
        method: 'PUT',
        body: { full_name: form.full_name.trim(), phone: form.phone.trim() }
      })
      updateUser(data.user)
      success('Your profile was updated.')
    } catch (err) {
      setProfileError(err.message || 'Could not update your profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordError('')

    const errors = {}
    if (!passwordForm.current_password) errors.current_password = 'Enter your current password.'
    if (passwordForm.new_password.length < 8) errors.new_password = 'New password must be at least 8 characters.'
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = 'New passwords do not match.'
    }
    setPasswordFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSavingPassword(true)
    try {
      await api('/auth/password', { method: 'PUT', body: passwordForm })
      success('Your password was changed.')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      setPasswordError(err.message || 'Could not change your password.')
    } finally {
      setSavingPassword(false)
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">My profile</h1>
        <p className="mt-1 text-slate-600">Manage your own account details.</p>
      </div>

      {/* Account overview */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Account</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">Email</dt>
            <dd className="mt-1 text-sm font-medium text-slate-800">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Role</dt>
            <dd className="mt-1"><RoleBadge role={user.role} /></dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-400">
          Email addresses and roles are managed by administrators.
        </p>
      </div>

      {/* Profile details */}
      <form
        onSubmit={handleProfileSubmit}
        className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        noValidate
      >
        <h2 className="font-semibold text-slate-900">Details</h2>

        {profileError && (
          <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {profileError}
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              id="profile-name"
              type="text"
              maxLength={100}
              value={form.full_name}
              onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              className={inputClass(profileFieldErrors.full_name)}
            />
            {profileFieldErrors.full_name && (
              <p className="mt-1 text-sm text-red-600">{profileFieldErrors.full_name}</p>
            )}
          </div>
          <div>
            <label htmlFor="profile-phone" className="block text-sm font-medium text-slate-700">
              Phone <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="profile-phone"
              type="tel"
              maxLength={30}
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="+1 555-0100"
              className={inputClass(false)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={savingProfile}
          className="mt-5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {savingProfile ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {/* Change password */}
      <form
        onSubmit={handlePasswordSubmit}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        noValidate
      >
        <h2 className="font-semibold text-slate-900">Change password</h2>

        {passwordError && (
          <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {passwordError}
          </div>
        )}

        <div className="mt-4 grid gap-4">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-slate-700">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={passwordForm.current_password}
              onChange={(event) =>
                setPasswordForm({ ...passwordForm, current_password: event.target.value })
              }
              className={inputClass(passwordFieldErrors.current_password)}
            />
            {passwordFieldErrors.current_password && (
              <p className="mt-1 text-sm text-red-600">{passwordFieldErrors.current_password}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={passwordForm.new_password}
                onChange={(event) =>
                  setPasswordForm({ ...passwordForm, new_password: event.target.value })
                }
                placeholder="At least 8 characters"
                className={inputClass(passwordFieldErrors.new_password)}
              />
              {passwordFieldErrors.new_password && (
                <p className="mt-1 text-sm text-red-600">{passwordFieldErrors.new_password}</p>
              )}
            </div>
            <div>
              <label htmlFor="confirm-new-password" className="block text-sm font-medium text-slate-700">
                Confirm new password
              </label>
              <input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirm_password}
                onChange={(event) =>
                  setPasswordForm({ ...passwordForm, confirm_password: event.target.value })
                }
                className={inputClass(passwordFieldErrors.confirm_password)}
              />
              {passwordFieldErrors.confirm_password && (
                <p className="mt-1 text-sm text-red-600">{passwordFieldErrors.confirm_password}</p>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={savingPassword}
          className="mt-5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {savingPassword ? 'Changing…' : 'Change password'}
        </button>
      </form>
    </div>
  )
}
