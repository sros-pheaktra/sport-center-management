import { Link } from 'react-router-dom'
import { CalendarCheck, CreditCard, UserPlus, Wrench } from 'lucide-react'
import { formatRelativeTime } from '../../utils/format'

const TYPE_META = {
  member: {
    icon: UserPlus,
    tone: 'bg-emerald-50 text-emerald-600'
  },
  booking: {
    icon: CalendarCheck,
    tone: 'bg-blue-50 text-blue-600'
  },
  payment: {
    icon: CreditCard,
    tone: 'bg-violet-50 text-violet-600'
  },
  maintenance: {
    icon: Wrench,
    tone: 'bg-amber-50 text-amber-600'
  }
}

export default function ActivityList({ items, now, emptyLabel = 'No recent activity yet.' }) {
  if (!items || items.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">{emptyLabel}</p>
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => {
        const meta = TYPE_META[item.type] || TYPE_META.booking
        const Icon = meta.icon

        return (
          <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                {item.link ? (
                  <Link
                    to={item.link}
                    className="min-w-0 truncate text-sm font-semibold text-slate-800 hover:text-blue-700"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <p className="min-w-0 truncate text-sm font-semibold text-slate-800">
                    {item.title}
                  </p>
                )}
                <time
                  dateTime={item.created_at}
                  className="shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-400"
                >
                  {formatRelativeTime(item.created_at, now)}
                </time>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">{item.description}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
