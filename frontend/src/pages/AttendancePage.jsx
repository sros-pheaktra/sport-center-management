import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Loading from '../components/Loading'
import { AttendanceStatusBadge } from '../components/Phase3Badges'
import { formatTime } from '../utils/format'
import { todayInputValue } from '../utils/reservation'
import { canManageSchedules } from '../utils/roles'

const formatClock = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const formatDay = (value) => {
  const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return '—'
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

// Staff clock in/out for the day; managers get the full attendance log.
export default function AttendancePage() {
  const { user } = useAuth()
  const manager = canManageSchedules(user)

  const [refreshKey, setRefreshKey] = useState(0)
  const [date, setDate] = useState(() => (manager ? todayInputValue() : ''))

  const handleChanged = () => setRefreshKey((key) => key + 1)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Attendance</h1>
        <p className="mt-1 text-slate-600">
          {manager
            ? 'Clock yourself in and review the attendance log for every staff member.'
            : 'Clock in and out for your shifts, and review your own attendance history.'}
        </p>
      </div>

      <AttendanceCard key={refreshKey} onChanged={handleChanged} />

      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-semibold text-slate-900">
            {manager ? 'Attendance log' : 'My attendance'}
          </h2>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
        </div>

        <AttendanceLog
          key={`${date}|${refreshKey}`}
          date={date}
          manager={manager}
        />
      </div>
    </div>
  )
}

function AttendanceCard({ onChanged }) {
  const { user } = useAuth()
  const { success, error } = useToast()

  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    let active = true

    api('/attendance/today')
      .then((result) => { if (active) setData(result) })
      .catch(() => { if (active) setLoadError('Could not load today’s attendance.') })

    return () => { active = false }
  }, [])

  const runAction = async (action) => {
    setBusy(action)
    try {
      const result = await api(`/attendance/${action}`, { method: 'POST' })
      success(result.message || 'Attendance updated.')
      onChanged()
    } catch (err) {
      error(err.message || 'Could not update your attendance.')
    } finally {
      setBusy('')
    }
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {loadError}
      </div>
    )
  }

  if (!data) {
    return <Loading label="Loading today’s attendance…" />
  }

  const attendance = data.attendance
  const canClockIn = !attendance || !attendance.clock_in
  const canClockOut = attendance && attendance.clock_in && !attendance.clock_out

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Today · {formatDay(data.date)}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            {user.full_name.split(' ')[0]}
          </h2>
          {attendance ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <AttendanceStatusBadge status={attendance.status} />
              <span>In: {formatClock(attendance.clock_in)}</span>
              <span>Out: {attendance.clock_out ? formatClock(attendance.clock_out) : '—'}</span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">You have not clocked in yet today.</p>
          )}
        </div>

        <div className="flex gap-3">
          {canClockIn && (
            <button
              type="button"
              disabled={busy !== ''}
              onClick={() => runAction('clock-in')}
              className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy === 'clock-in' ? 'Clocking in…' : 'Clock in'}
            </button>
          )}
          {canClockOut && (
            <button
              type="button"
              disabled={busy !== ''}
              onClick={() => runAction('clock-out')}
              className="rounded-md bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
            >
              {busy === 'clock-out' ? 'Clocking out…' : 'Clock out'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Today’s shifts
        </h3>
        {data.shifts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No shift is scheduled for today.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {data.shifts.map((shift) => (
              <li key={shift.id}>
                <span className="font-medium">{formatTime(shift.starts_at)}–{formatTime(shift.ends_at)}</span>
                {shift.notes && <span className="text-slate-500"> · {shift.notes}</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-slate-400">
          Clocking in more than 15 minutes after your first shift starts is recorded as late.
        </p>
      </div>
    </section>
  )
}

function AttendanceLog({ date, manager }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    api(`/attendance${date ? `?date=${date}` : ''}`)
      .then((data) => {
        if (!active) return
        setRows(data.attendance)
        setError('')
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('Could not load the attendance log. Please try again.')
        setLoading(false)
      })

    return () => { active = false }
  }, [date])

  if (loading) {
    return <Loading label="Loading attendance…" />
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="font-semibold text-slate-800">No attendance recorded</p>
        <p className="mt-1 text-sm text-slate-600">
          {manager ? 'Nobody has clocked in for this date.' : 'You have no attendance rows for this date.'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Date</th>
            {manager && <th className="px-4 py-3 font-semibold">Staff</th>}
            <th className="px-4 py-3 font-semibold">Shift</th>
            <th className="px-4 py-3 font-semibold">Clock in</th>
            <th className="px-4 py-3 font-semibold">Clock out</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 text-slate-700">{formatDay(row.work_date)}</td>
              {manager && (
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{row.staff_name}</p>
                  <p className="text-xs text-slate-500">{row.staff_email}</p>
                </td>
              )}
              <td className="px-4 py-3 text-slate-600">
                {row.shift_start && row.shift_end
                  ? `${formatTime(row.shift_start)}–${formatTime(row.shift_end)}`
                  : '—'}
              </td>
              <td className="px-4 py-3 text-slate-700">{formatClock(row.clock_in)}</td>
              <td className="px-4 py-3 text-slate-700">
                {row.clock_out ? formatClock(row.clock_out) : '—'}
              </td>
              <td className="px-4 py-3">
                <AttendanceStatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
