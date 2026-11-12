import { TrendingDown, TrendingUp } from 'lucide-react'

const TONES = {
  blue: { icon: 'bg-blue-50 text-blue-600', bar: 'bg-blue-500' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500' },
  violet: { icon: 'bg-violet-50 text-violet-600', bar: 'bg-violet-500' },
  amber: { icon: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500' },
  sky: { icon: 'bg-sky-50 text-sky-600', bar: 'bg-sky-500' },
  red: { icon: 'bg-red-50 text-red-600', bar: 'bg-red-500' }
}

export default function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = 'blue',
  trend,
  trendLabel = 'vs last month'
}) {
  const palette = TONES[tone] || TONES.blue
  const hasTrend = typeof trend === 'number' && Number.isFinite(trend)
  const positive = hasTrend && trend >= 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        {Icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${palette.icon}`}>
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
        )}
      </div>

      <div className="mt-3 flex min-h-5 flex-wrap items-center gap-2">
        {hasTrend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              positive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {positive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend)}%
          </span>
        )}
        {hasTrend && <span className="text-[11px] text-slate-400">{trendLabel}</span>}
        {!hasTrend && hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>

      {hasTrend && hint && (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}

      <div className={`mt-4 h-1 w-10 rounded-full ${palette.bar}`} />
    </div>
  )
}
