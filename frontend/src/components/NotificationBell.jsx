import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { api } from '../api'

// Bell in the top header: shows the unread count and refreshes when
// the notifications page marks something read (custom event) or every
// 60 seconds while the tab stays open.
export default function NotificationBell({ user }) {
  const userId = user?.id
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!userId) return

    let active = true

    const load = () => {
      api('/notifications?limit=1')
        .then((data) => {
          if (active) setUnread(Number(data.unread_count) || 0)
        })
        .catch(() => {})
    }

    const onRefresh = () => load()

    load()
    window.addEventListener('notifications:refresh', onRefresh)
    const timer = setInterval(load, 60000)

    return () => {
      active = false
      window.removeEventListener('notifications:refresh', onRefresh)
      clearInterval(timer)
    }
  }, [userId])

  if (!user) return null

  return (
    <Link
      to="/notifications"
      title={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      className="relative rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
    >
      <Bell className="h-[18px] w-[18px]" />
      {unread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-white">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}
