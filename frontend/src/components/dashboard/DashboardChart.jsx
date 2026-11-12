import { useId } from 'react'
import { reservationStatusLabel } from '../../utils/reservation'
import { buildSeries } from '../../utils/dashboardChart'

// Charts are hand-built SVG/CSS so the project keeps its lean
// dependency list. They all receive data already fetched by the
// dashboard page — no chart library, no extra requests.

function RevenueAreaChart({ series, range, now }) {
  const rawId = useId()
  const gradientId = `revenue-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const points = buildSeries(series, range, now)
  const max = Math.max(...points.map((point) => point.value), 1)

  const coords = points.map((point, index) => ({
    x: points.length === 1 ? 50 : (index / (points.length - 1)) * 100,
    y: 94 - (point.value / max) * 86
  }))

  const line = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ')

  const area = `${line} L100,100 L0,100 Z`

  return (
    <div>
      <div className="relative">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-52 w-full"
          role="img"
          aria-label={`Revenue for the last ${points.length} ${range === 'monthly' ? 'months' : range === 'weekly' ? 'weeks' : 'days'}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[25, 50, 75].map((position) => (
            <line
              key={position}
              x1="0"
              y1={position}
              x2="100"
              y2={position}
              stroke="#e2e8f0"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="mt-3 flex gap-1">
        {points.map((point, index) => (
          <span
            key={point.key}
            className={`flex-1 truncate text-center text-[9px] font-medium text-slate-400 sm:text-[10px] ${
              index % 2 === 0 ? 'visible' : 'invisible sm:visible'
            }`}
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function BookingBarChart({ series, now }) {
  const points = buildSeries(series, 'daily', now)
  const max = Math.max(...points.map((point) => point.value), 1)

  return (
    <div>
      <div className="flex h-48 items-end gap-1 sm:gap-1.5">
        {points.map((point) => (
          <div
            key={point.key}
            className="group flex h-full flex-1 flex-col justify-end"
            title={`${point.label}: ${point.value} booking${point.value === 1 ? '' : 's'}`}
          >
            <div
              className="w-full rounded-t-sm bg-blue-500/80 transition-colors group-hover:bg-blue-600"
              style={{ height: `${Math.max(3, (point.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-1">
        {points.map((point) => (
          <span
            key={point.key}
            className="flex-1 truncate text-center text-[9px] font-medium text-slate-400 sm:text-[10px]"
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#10b981',
  checked_in: '#0ea5e9',
  completed: '#64748b',
  cancelled: '#ef4444',
  no_show: '#8b5cf6'
}

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function StatusDonut({ distribution }) {
  const entries = Object.entries(distribution || {})
    .map(([status, count]) => ({ status, count: Number(count) || 0 }))
    .filter((entry) => entry.count > 0)

  const total = entries.reduce((sum, entry) => sum + entry.count, 0)

  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        No bookings have been made yet.
      </p>
    )
  }

  let consumed = 0
  const segments = entries.map((entry) => {
    const fraction = entry.count / total
    const segment = {
      ...entry,
      fraction,
      dash: fraction * CIRCUMFERENCE,
      offset: consumed * CIRCUMFERENCE
    }
    consumed += fraction
    return segment
  })

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label="Booking status distribution">
          <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth="14" />
          {segments.map((segment) => (
            <circle
              key={segment.status}
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke={STATUS_COLORS[segment.status] || '#94a3b8'}
              strokeWidth="14"
              strokeDasharray={`${segment.dash} ${CIRCUMFERENCE - segment.dash}`}
              strokeDashoffset={-segment.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-[11px] font-medium text-slate-400">bookings</span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-2">
        {segments.map((segment) => (
          <li key={segment.status} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[segment.status] || '#94a3b8' }}
            />
            <span className="min-w-0 flex-1 truncate text-slate-600">
              {reservationStatusLabel(segment.status)}
            </span>
            <span className="shrink-0 font-semibold text-slate-800">{segment.count}</span>
            <span className="w-10 shrink-0 text-right text-xs text-slate-400">
              {Math.round(segment.fraction * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// One entry point for the three chart styles used on the dashboard.
export default function DashboardChart({ variant = 'area', ...props }) {
  if (variant === 'bar') return <BookingBarChart {...props} />
  if (variant === 'donut') return <StatusDonut {...props} />
  return <RevenueAreaChart {...props} />
}
