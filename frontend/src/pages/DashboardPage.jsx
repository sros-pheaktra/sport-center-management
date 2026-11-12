import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CalendarPlus,
  Clock3,
  CreditCard,
  DollarSign,
  ScanLine,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wrench
} from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/Loading'
import RoleBadge from '../components/RoleBadge'
import StatusBadge from '../components/StatusBadge'
import ReservationStatusBadge from '../components/ReservationStatusBadge'
import StatCard from '../components/dashboard/StatCard'
import DashboardChart from '../components/dashboard/DashboardChart'
import { revenueInView } from '../utils/dashboardChart'
import ActivityList from '../components/dashboard/ActivityList'
import { formatPrice } from '../utils/format'
import { canManageContent, canManageUsers, isStaffSide } from '../utils/roles'

const RANGES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
]

const RANGE_DESCRIPTIONS = {
  daily: 'Last 14 days',
  weekly: 'Last 8 weeks',
  monthly: 'Last 12 months'
}

const timeOf = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const initialsOf = (name) =>
  String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'U'

function Panel({ title, description, action, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function TrendNote({ value }) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null

  const positive = value >= 0

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        positive ? 'text-emerald-600' : 'text-red-600'
      }`}
    >
      {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {Math.abs(value)}% vs last month
    </span>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()

  // Customers never reach this page through the guarded route, but the
  // fallback keeps the component safe if it is ever reused directly.
  if (!isStaffSide(user)) {
    return <CustomerDashboard name={user?.full_name} />
  }

  return <StaffDashboard user={user} />
}

function StaffDashboard({ user }) {
  const [data, setData] = useState(null)
  const [now, setNow] = useState(0)
  const [error, setError] = useState('')
  const [range, setRange] = useState('daily')

  useEffect(() => {
    let active = true

    api('/dashboard/stats')
      .then((result) => {
        if (!active) return
        setData(result)
        setNow(Date.now())
      })
      .catch(() => {
        if (active) setError('Could not load the dashboard. Please try again.')
      })

    return () => { active = false }
  }, [])

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          {error}
        </div>
      </div>
    )
  }

  if (!data || !now) {
    return <Loading label="Loading dashboard…" />
  }

  const { stats } = data
  const todayBookings = data.today_bookings || []
  const recentActivity = data.recent_activity || []
  const recentUsers = data.recent_users || []
  const recentFacilities = data.recent_facilities || []
  const revenueSeries = data.revenue_series || { daily: [], weekly: [], monthly: [] }
  const bookingTrend = data.booking_trend || []
  const facilitiesByStatus = stats.facilities_by_status || {}
  const usersByRole = stats.users_by_role || {}

  const firstName = String(user?.full_name || '').split(' ')[0] || 'there'
  const todayLabel = new Date(now).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const availability = [
    {
      label: 'Available',
      value: Number(stats.available_facilities) || 0,
      bar: 'bg-emerald-500'
    },
    {
      label: 'In use now',
      value: Number(stats.occupied_facilities) || 0,
      bar: 'bg-blue-500'
    },
    {
      label: 'Under maintenance',
      value: Number(facilitiesByStatus.maintenance) || 0,
      bar: 'bg-amber-500'
    },
    {
      label: 'Unavailable',
      value: Number(facilitiesByStatus.unavailable) || 0,
      bar: 'bg-slate-400'
    }
  ]

  const facilityBase = Math.max(Number(stats.total_facilities) || 0, 1)

  const quickActions = [
    {
      to: '/',
      label: 'Create booking',
      description: 'Reserve a court or facility',
      icon: CalendarPlus,
      tone: 'bg-blue-50 text-blue-600'
    },
    canManageUsers(user)
      ? {
          to: '/users',
          label: 'Add member',
          description: 'Create a customer account',
          icon: UserPlus,
          tone: 'bg-emerald-50 text-emerald-600'
        }
      : {
          to: '/check-in',
          label: 'Check in guest',
          description: 'Find an arriving booking',
          icon: ScanLine,
          tone: 'bg-emerald-50 text-emerald-600'
        },
    canManageContent(user)
      ? {
          to: '/facilities/new',
          label: 'Add facility',
          description: 'Publish a new venue',
          icon: Building2,
          tone: 'bg-violet-50 text-violet-600'
        }
      : {
          to: '/maintenance',
          label: 'New maintenance job',
          description: 'Log an issue for staff',
          icon: Wrench,
          tone: 'bg-violet-50 text-violet-600'
        },
    {
      to: '/payments',
      label: 'Record payment',
      description: 'Settle at-center balances',
      icon: CreditCard,
      tone: 'bg-amber-50 text-amber-600'
    }
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Greeting */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Welcome back, {firstName}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {todayLabel} · Here is what is happening at the center today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RoleBadge role={user?.role} />
          <Link
            to="/bookings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            All bookings
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total bookings"
          value={Number(stats.total_bookings) || 0}
          icon={CalendarCheck}
          tone="blue"
          trend={stats.bookings_trend}
          hint={`${Number(stats.pending_bookings) || 0} pending approval`}
        />
        <StatCard
          title="Active members"
          value={Number(stats.active_memberships) || 0}
          icon={Users}
          tone="emerald"
          hint={`${Number(usersByRole.customer) || 0} customer accounts`}
        />
        <StatCard
          title="Total revenue"
          value={formatPrice(stats.total_revenue)}
          icon={DollarSign}
          tone="violet"
          trend={stats.revenue_trend}
          hint={`${formatPrice(stats.revenue_this_month)} this month`}
        />
        <StatCard
          title="Available facilities"
          value={Number(stats.available_facilities) || 0}
          icon={Building2}
          tone="sky"
          hint={`${Number(stats.occupied_facilities) || 0} occupied right now`}
        />
        <StatCard
          title="Pending bookings"
          value={Number(stats.pending_bookings) || 0}
          icon={Clock3}
          tone="amber"
          hint={`${Number(stats.today_bookings) || 0} scheduled today`}
        />
        <StatCard
          title="Equipment maintenance"
          value={Number(stats.equipment_maintenance) || 0}
          icon={Wrench}
          tone="red"
          hint={`${Number(stats.overdue_rentals) || 0} overdue rentals`}
        />
      </div>

      {/* Revenue + quick actions */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Revenue overview"
          description={RANGE_DESCRIPTIONS[range]}
          action={
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {RANGES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  aria-pressed={range === option.value}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    range === option.value
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {formatPrice(revenueInView(revenueSeries[range], range, now))}
            </span>
            <span className="text-xs font-medium text-slate-500">collected in view</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">
              {formatPrice(stats.revenue_this_month)} this month
            </span>
            <TrendNote value={stats.revenue_trend} />
          </div>

          <div className="mt-4">
            <DashboardChart variant="area" series={revenueSeries[range]} range={range} now={now} />
          </div>
        </Panel>

        <Panel
          title="Quick actions"
          description="Common tasks for daily operations"
        >
          <div className="space-y-2.5">
            {quickActions.map((action) => {
              const Icon = action.icon

              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className="group flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50/60"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${action.tone}`}>
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">
                      {action.label}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {action.description}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-blue-500" />
                </Link>
              )
            })}
          </div>
        </Panel>
      </div>

      {/* Booking analytics */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Booking trend"
          description="Reservations created over the last 14 days"
          action={
            <Link to="/bookings" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              View bookings
            </Link>
          }
        >
          <DashboardChart variant="bar" series={bookingTrend} now={now} />
        </Panel>

        <Panel title="Status distribution" description="All bookings by current status">
          <DashboardChart variant="donut" distribution={stats.booking_status} />
        </Panel>
      </div>

      {/* Today's bookings + facility availability */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Today's bookings"
          description={`${Number(stats.today_bookings) || 0} booking${Number(stats.today_bookings) === 1 ? '' : 's'} scheduled today`}
          action={
            <Link to="/bookings" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              View all
            </Link>
          }
        >
          {todayBookings.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Nothing scheduled for today yet.
            </p>
          ) : (
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/70 text-left text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-2.5 font-semibold sm:px-6">Facility</th>
                    <th className="px-5 py-2.5 font-semibold sm:px-6">Customer</th>
                    <th className="px-5 py-2.5 font-semibold sm:px-6">Time</th>
                    <th className="px-5 py-2.5 font-semibold sm:px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayBookings.map((booking) => (
                    <tr key={booking.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-5 py-3 sm:px-6">
                        <Link
                          to={`/bookings/${booking.reference}`}
                          className="font-medium text-slate-800 hover:text-blue-700"
                        >
                          {booking.facility_title}
                        </Link>
                        <span className="block font-mono text-[11px] text-slate-400">
                          {booking.reference}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 sm:px-6">
                        {booking.customer_name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600 sm:px-6">
                        {timeOf(booking.starts_at)} – {timeOf(booking.ends_at)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 sm:px-6">
                        <ReservationStatusBadge status={booking.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          title="Facility availability"
          description={`${Number(stats.total_facilities) || 0} facilities across the center`}
        >
          <div className="space-y-3">
            {availability.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">{item.label}</span>
                  <span className="font-semibold text-slate-800">{item.value}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${item.bar}`}
                    style={{ width: `${Math.min(100, (item.value / facilityBase) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {recentFacilities.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Recently added
              </p>
              <ul className="mt-2 divide-y divide-slate-100">
                {recentFacilities.slice(0, 3).map((facility) => (
                  <li
                    key={facility.id}
                    className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/facilities/${facility.id}`}
                        className="block truncate text-sm font-medium text-slate-800 hover:text-blue-700"
                      >
                        {facility.title}
                      </Link>
                      <p className="truncate text-[11px] text-slate-400">
                        {facility.category_name}
                      </p>
                    </div>
                    <StatusBadge status={facility.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      {/* Activity + newest members */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Recent activity"
          description="Bookings, member sign-ups, payments and maintenance updates"
          action={
            <Link to="/notifications" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Notifications
            </Link>
          }
        >
          <ActivityList items={recentActivity} now={now} />
        </Panel>

        <Panel
          title="Newest members"
          description="Latest accounts created"
          action={
            canManageUsers(user) ? (
              <Link to="/users" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                Manage
              </Link>
            ) : null
          }
        >
          <ul className="divide-y divide-slate-100">
            {recentUsers.map((member) => (
              <li key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  {initialsOf(member.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {member.full_name}
                  </p>
                  <p className="truncate text-xs text-slate-500">{member.email}</p>
                </div>
                <RoleBadge role={member.role} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function QuickLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700"
    >
      {children}
    </Link>
  )
}

function CustomerDashboard({ name }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
          Customer account
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Welcome back{name ? `, ${name.split(' ')[0]}` : ''}!
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Browse the center&apos;s facilities to find a court that suits you, then manage
          your bookings, membership and payments from one place.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Browse facilities
            <ArrowRight className="h-4 w-4" />
          </Link>
          <QuickLink to="/bookings">My bookings</QuickLink>
          <QuickLink to="/memberships">My membership</QuickLink>
          <QuickLink to="/profile">My profile</QuickLink>
        </div>
      </div>
    </div>
  )
}
