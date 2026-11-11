import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import RoleBadge from './RoleBadge'
import { canManageContent, canManageUsers, isStaffSide } from '../utils/roles'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      success('You have been logged out.')
      navigate('/')
    } catch {
      error('Logout failed. Please try again.')
    }
  }

  const linkClass = ({ isActive }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${
      isActive ? 'text-emerald-700' : 'text-slate-600 hover:text-slate-900'
    }`

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span className="text-lg">Sport Center</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <NavLink to="/" className={linkClass}>
            Facilities
          </NavLink>

          {/* Staff-side navigation grows in later phases (bookings,
              schedules, maintenance, …) */}
          {isStaffSide(user) && (
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
          )}

          {canManageUsers(user) && (
            <NavLink to="/users" className={linkClass}>
              Users
            </NavLink>
          )}

          {canManageContent(user) && (
            <NavLink to="/categories" className={linkClass}>
              Categories
            </NavLink>
          )}

          {user ? (
            <>
              <Link
                to="/profile"
                title={user.email}
                className="ml-1 hidden items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 md:inline-flex"
              >
                <span className="font-medium">{user.full_name.split(' ')[0]}</span>
                <RoleBadge role={user.role} />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
