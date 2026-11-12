import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
import Loading from '../components/Loading'
import { NotificationTypeBadge } from '../components/Phase4Badges'

const formatWhen = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Personal in-app inbox for every role.
export default function NotificationsPage() {
  const { success, error } = useToast()

  const [data, setData] = useState(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    let active = true

    api(`/notifications${unreadOnly ? '?unread=1' : ''}`)
      .then((result) => {
        if (!active) return
        setData(result)
        setLoadError('')
      })
      .catch(() => {
        if (!active) return
        setLoadError('Could not load your notifications. Please try again.')
      })

    return () => { active = false }
  }, [unreadOnly, refreshKey])

  const broadcast = () => window.dispatchEvent(new Event('notifications:refresh'))

  const markRead = async (notification) => {
    if (notification.is_read) return

    setBusyId(notification.id)
    try {
      await api(`/notifications/${notification.id}/read`, { method: 'POST' })
      broadcast()
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not mark that notification as read.')
    } finally {
      setBusyId(null)
    }
  }

  const markAll = async () => {
    setBusyId('all')
    try {
      await api('/notifications/read-all', { method: 'POST' })
      success('All notifications marked as read.')
      broadcast()
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not mark all notifications as read.')
    } finally {
      setBusyId(null)
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          {loadError}
        </div>
      </div>
    )
  }

  if (!data) {
    return <Loading label="Loading notifications…" />
  }

  const notifications = unreadOnly
    ? data.notifications.filter((item) => !item.is_read)
    : data.notifications

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-slate-600">
            Booking updates, payments, maintenance and membership news.
            {data.unread_count > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                {data.unread_count} unread
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Unread only
          </label>
          <button
            type="button"
            onClick={markAll}
            disabled={busyId !== null || data.unread_count === 0}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {busyId === 'all' ? 'Marking…' : 'Mark all read'}
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-800">You are all caught up</p>
          <p className="mt-1 text-sm text-slate-600">
            {unreadOnly
              ? 'There are no unread notifications.'
              : 'No notifications have been sent to you yet.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`rounded-xl border p-4 shadow-sm transition ${
                notification.is_read
                  ? 'border-slate-200 bg-white'
                  : 'border-emerald-200 bg-emerald-50/60'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <NotificationTypeBadge type={notification.type} />
                    {!notification.is_read && (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        New
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {formatWhen(notification.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold text-slate-900">{notification.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  {notification.link && (
                    <Link
                      to={notification.link}
                      className="text-sm font-medium text-emerald-700 hover:underline"
                    >
                      Open →
                    </Link>
                  )}
                  {!notification.is_read && (
                    <button
                      type="button"
                      onClick={() => markRead(notification)}
                      disabled={busyId !== null}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      {busyId === notification.id ? 'Marking…' : 'Mark read'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
