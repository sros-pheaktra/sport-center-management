import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import Loading from '../components/Loading'
import { formatTime } from '../utils/format'
import { mondayOf, shiftDateInput, todayInputValue } from '../utils/reservation'
import { canManageSchedules } from '../utils/roles'

const formatDay = (value) => {
  const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return '—'
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  })
}

// Managers assign shifts across the week; staff see their own roster.
export default function SchedulesPage() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const manager = canManageSchedules(user)

  const [weekStart, setWeekStart] = useState(() => mondayOf(todayInputValue()))
  const [refreshKey, setRefreshKey] = useState(0)
  const [staff, setStaff] = useState([])
  const [dialog, setDialog] = useState(null) // null | 'new' | shift
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!manager) return

    let active = true

    api('/users?role=staff')
      .then((data) => { if (active) setStaff(data.users) })
      .catch(() => {})

    return () => { active = false }
  }, [manager])

  const weekEnd = shiftDateInput(weekStart, 6)

  const openCreate = () => setDialog('new')

  const removeShift = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      await api(`/schedules/${deleteTarget.id}`, { method: 'DELETE' })
      success('Shift removed.')
      setDeleteTarget(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not remove this shift.')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {manager ? 'Staff schedules' : 'My week'}
          </h1>
          <p className="mt-1 text-slate-600">
            {manager
              ? 'Assign shifts for the week. Staff see their own roster here.'
              : 'Your assigned shifts for the week.'}
          </p>
        </div>
        {manager && (
          <button
            type="button"
            onClick={openCreate}
            disabled={staff.length === 0}
            className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            + Assign shift
          </button>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((value) => shiftDateInput(value, -7))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(mondayOf(todayInputValue()))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((value) => shiftDateInput(value, 7))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Next →
          </button>
        </div>
        <p className="text-sm font-medium text-slate-700">
          {formatDay(weekStart)} – {formatDay(weekEnd)}
        </p>
      </div>

      <ScheduleWeek
        key={`${weekStart}|${refreshKey}`}
        weekStart={weekStart}
        manager={manager}
        onEdit={setDialog}
        onDelete={setDeleteTarget}
      />

      {dialog && manager && (
        <ShiftDialog
          key={dialog === 'new' ? 'new' : dialog.id}
          schedule={dialog === 'new' ? null : dialog}
          staff={staff}
          defaultDate={
            weekStart <= todayInputValue() && todayInputValue() <= weekEnd
              ? todayInputValue()
              : weekStart
          }
          onClose={() => setDialog(null)}
          onSaved={(message, wasEdit) => {
            setDialog(null)
            success(message || (wasEdit ? 'Shift updated.' : 'Shift assigned.'))
            setRefreshKey((key) => key + 1)
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove this shift?"
        message="The staff member will no longer be scheduled for this slot."
        confirmLabel="Remove shift"
        busy={deleting}
        onConfirm={removeShift}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function ScheduleWeek({ weekStart, manager, onEdit, onDelete }) {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const to = shiftDateInput(weekStart, 6)

    api(`/schedules?from=${weekStart}&to=${to}`)
      .then((data) => {
        if (!active) return
        setSchedules(data.schedules)
        setError('')
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('Could not load the schedule. Please try again.')
        setLoading(false)
      })

    return () => { active = false }
  }, [weekStart])

  if (loading) {
    return <Loading label="Loading schedule…" />
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    )
  }

  const days = Array.from({ length: 7 }, (_, index) => shiftDateInput(weekStart, index))
  const totalShifts = schedules.length

  if (totalShifts === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-lg font-semibold text-slate-800">No shifts this week</p>
        <p className="mt-1 text-sm text-slate-600">
          {manager
            ? 'Use “Assign shift” to add the first one.'
            : 'Your manager has not scheduled any shifts for you this week.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const daySchedules = schedules.filter(
          (schedule) => String(schedule.work_date).slice(0, 10) === day
        )

        return (
          <section key={day} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">{formatDay(day)}</h2>
              <span className="text-xs text-slate-500">
                {daySchedules.length} {daySchedules.length === 1 ? 'shift' : 'shifts'}
              </span>
            </div>

            {daySchedules.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No shifts.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {daySchedules.map((schedule) => (
                  <li key={schedule.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {formatTime(schedule.starts_at)}–{formatTime(schedule.ends_at)}
                        <span className="ml-2 font-normal text-slate-600">
                          {schedule.staff_name}
                        </span>
                      </p>
                      {schedule.notes && (
                        <p className="text-xs text-slate-500">{schedule.notes}</p>
                      )}
                    </div>

                    {manager && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(schedule)}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(schedule)}
                          className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

function ShiftDialog({ schedule, staff, defaultDate, onClose, onSaved }) {
  const isEdit = Boolean(schedule)

  const [form, setForm] = useState(() => (
    isEdit
      ? {
          user_id: String(schedule.user_id),
          work_date: String(schedule.work_date).slice(0, 10),
          starts_at: formatTime(schedule.starts_at),
          ends_at: formatTime(schedule.ends_at),
          notes: schedule.notes || ''
        }
      : {
          user_id: staff[0] ? String(staff[0].id) : '',
          work_date: defaultDate,
          starts_at: '08:00',
          ends_at: '16:00',
          notes: ''
        }
  ))

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    const body = {
      user_id: Number(form.user_id),
      work_date: form.work_date,
      starts_at: form.starts_at,
      ends_at: form.ends_at,
      notes: form.notes.trim()
    }

    if (!body.user_id) {
      setFormError('Please choose a staff member.')
      return
    }

    if (body.ends_at <= body.starts_at) {
      setFormError('The shift must end after it starts.')
      return
    }

    setSaving(true)
    try {
      const data = isEdit
        ? await api(`/schedules/${schedule.id}`, { method: 'PUT', body })
        : await api('/schedules', { method: 'POST', body })

      onSaved(data.message, isEdit)
    } catch (err) {
      setFormError(err.message || 'Could not save this shift. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-dialog-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="shift-dialog-title" className="text-lg font-semibold text-slate-900">
          {isEdit ? 'Edit shift' : 'Assign shift'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          A staff member can only have one shift starting at the same time on a day.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
          {formError && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="shift-staff" className="block text-sm font-medium text-slate-700">
              Staff member
            </label>
            <select
              id="shift-staff"
              value={form.user_id}
              onChange={(event) => setForm({ ...form, user_id: event.target.value })}
              className={`${inputClass} bg-white`}
            >
              {staff.map((member) => (
                <option key={member.id} value={member.id}>{member.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="shift-date" className="block text-sm font-medium text-slate-700">
              Work date
            </label>
            <input
              id="shift-date"
              type="date"
              value={form.work_date}
              onChange={(event) => setForm({ ...form, work_date: event.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="shift-start" className="block text-sm font-medium text-slate-700">
                Starts at
              </label>
              <input
                id="shift-start"
                type="time"
                value={form.starts_at}
                onChange={(event) => setForm({ ...form, starts_at: event.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="shift-end" className="block text-sm font-medium text-slate-700">
                Ends at
              </label>
              <input
                id="shift-end"
                type="time"
                value={form.ends_at}
                onChange={(event) => setForm({ ...form, ends_at: event.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="shift-notes" className="block text-sm font-medium text-slate-700">
              Notes <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="shift-notes"
              type="text"
              maxLength={255}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              className={inputClass}
            />
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Assign shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
