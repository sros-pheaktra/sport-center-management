import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/Loading'
import RoleBadge from '../components/RoleBadge'
import StatusBadge from '../components/StatusBadge'
import { formatDate, formatPrice } from '../utils/format'
import {
  canManageContent,
  canManagePlans,
  canManageSchedules,
  canManageUsers
} from '../utils/roles'

export default function DashboardPage() {
  const { user } = useAuth()

  // Customers get a personal summary; staff-side roles get the
  // center overview with statistics from /api/dashboard/stats
  if (!isStaffRole(user)) {
    return <CustomerDashboard name={user?.full_name} />
  }

  return <StaffDashboard />
}

const isStaffRole = (user) =>
  Boolean(user) && ['admin', 'manager', 'staff'].includes(user.role)

function StatCard({ title, value, chips }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {chips && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map(({ label, count }) => (
            <span
              key={label}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
            >
              {count} {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function QuickLink({ to, children }) {
  return (
    <Link
      to={to}
      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
    >
      {children}
    </Link>
  )
}

function StaffDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    api('/dashboard/stats')
      .then((result) => { if (active) setData(result) })
      .catch(() => { if (active) setError('Could not load the dashboard. Please try again.') })

    return () => { active = false }
  }, [])

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return <Loading label="Loading dashboard…" />
  }

  const { stats, recent_users: recentUsers, recent_facilities: recentFacilities } = data

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 flex items-center gap-2 text-slate-600">
            Welcome back, {user.full_name.split(' ')[0]} <RoleBadge role={user.role} />
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canManageUsers(user) && <QuickLink to="/users">Manage users</QuickLink>}
          <QuickLink to="/bookings">View bookings</QuickLink>
          <QuickLink to="/calendar">Booking calendar</QuickLink>
          <QuickLink to="/payments">Payments</QuickLink>
          <QuickLink to="/schedules">
            {canManageSchedules(user) ? 'Staff schedules' : 'My schedule'}
          </QuickLink>
          <QuickLink to="/attendance">Attendance</QuickLink>
          <QuickLink to="/maintenance">Maintenance</QuickLink>
          {canManagePlans(user) && <QuickLink to="/memberships">Membership plans</QuickLink>}
          {canManageContent(user) && <QuickLink to="/facilities/new">+ Add facility</QuickLink>}
          <QuickLink to="/">Browse facilities</QuickLink>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Accounts"
          value={stats.total_users}
          chips={[
            { label: 'customers', count: stats.users_by_role.customer || 0 },
            { label: 'staff', count: stats.users_by_role.staff || 0 },
            { label: 'managers', count: stats.users_by_role.manager || 0 },
            { label: 'admins', count: stats.users_by_role.admin || 0 }
          ]}
        />
        <StatCard
          title="Facilities"
          value={stats.total_facilities}
          chips={[
            { label: 'available', count: stats.facilities_by_status.available || 0 },
            { label: 'maintenance', count: stats.facilities_by_status.maintenance || 0 },
            { label: 'unavailable', count: stats.facilities_by_status.unavailable || 0 }
          ]}
        />
        <StatCard title="Categories" value={stats.total_categories} />
        <StatCard title="Today’s bookings" value={stats.today_bookings} />
        <StatCard
          title="Revenue this month"
          value={formatPrice(stats.revenue_this_month)}
          chips={[
            { label: 'pending at-center payments', count: stats.pending_payments }
          ]}
        />
        <StatCard title="Active memberships" value={stats.active_memberships} />
        <StatCard title="Open maintenance" value={stats.open_maintenance} />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Newest accounts</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {recentUsers.map((recent) => (
              <li key={recent.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{recent.full_name}</p>
                  <p className="truncate text-xs text-slate-500">{recent.email}</p>
                </div>
                <RoleBadge role={recent.role} />
              </li>
            ))}
          </ul>
          {canManageUsers(user) && (
            <Link to="/users" className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline">
              Manage all users →
            </Link>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Newest facilities</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {recentFacilities.map((recent) => (
              <li key={recent.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    to={`/facilities/${recent.id}`}
                    className="truncate text-sm font-medium text-slate-800 hover:text-emerald-700"
                  >
                    {recent.title}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {recent.category_name} · added {formatDate(recent.created_at)}
                  </p>
                </div>
                <StatusBadge status={recent.status} />
              </li>
            ))}
          </ul>
          <Link to="/" className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline">
            Browse all facilities →
          </Link>
        </section>
      </div>
    </div>
  )
}

function CustomerDashboard({ name }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back{name ? `, ${name.split(' ')[0]}` : ''}!
        </h1>
        <p className="mt-2 text-slate-600">
          You are signed in to your customer account. Browse the center's facilities
          to find a court that suits you.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Browse facilities
          </Link>
          <QuickLink to="/bookings">My bookings</QuickLink>
          <QuickLink to="/memberships">My membership</QuickLink>
          <QuickLink to="/profile">My profile</QuickLink>
        </div>
      </div>
    </div>
  )
}
