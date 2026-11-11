import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loading from './Loading'

// Friendly panel shown when a logged-in user opens a page their
// role may not use. The server rejects such requests anyway (403).
export function AccessDenied() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-5xl font-bold text-slate-300">403</h1>
      <h2 className="mt-3 text-xl font-semibold text-slate-800">Access denied</h2>
      <p className="mt-2 text-slate-600">
        Your account does not have permission to view this page.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        ← Back to the facilities
      </Link>
    </div>
  )
}

// Wrap any route that needs a logged-in user (any role)
export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Loading label="Loading…" />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

// Wrap routes that are limited to specific roles, e.g.
//   <RoleGuard roles={['admin', 'manager']}>…</RoleGuard>
export function RoleGuard({ roles, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Loading label="Loading…" />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!roles.includes(user.role)) {
    return <AccessDenied />
  }

  return children
}
