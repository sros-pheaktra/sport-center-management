import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Loading from '../components/Loading'
import {
  MaintenanceStatusBadge,
  PriorityBadge
} from '../components/Phase3Badges'
import { formatDate } from '../utils/format'
import { canResolveMaintenance } from '../utils/roles'

// Staff file maintenance issues; managers work and resolve them.
// The facility status follows automatically on the server.
export default function MaintenancePage() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const manager = canResolveMaintenance(user)

  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [facilities, setFacilities] = useState([])

  const [showRequest, setShowRequest] = useState(false)
  const [resolveTarget, setResolveTarget] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const hasFilters = status || priority

  useEffect(() => {
    let active = true

    api('/facilities')
      .then((data) => { if (active) setFacilities(data.facilities) })
      .catch(() => {})

    return () => { active = false }
  }, [refreshKey])

  const startWork = async (request) => {
    setBusyId(request.id)
    try {
      await api(`/maintenance/${request.id}`, {
        method: 'PUT',
        body: { status: 'in_progress' }
      })
      success('Work started — the facility stays under maintenance.')
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not update this request.')
    } finally {
      setBusyId(null)
    }
  }

  const handleResolved = (message) => {
    setResolveTarget(null)
    success(message || 'Maintenance request updated.')
    setRefreshKey((key) => key + 1)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Maintenance</h1>
          <p className="mt-1 text-slate-600">
            {manager
              ? 'Track issues and resolve them. A facility stays in maintenance until the last active request is closed.'
              : 'Report facility issues and start work on open requests.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRequest(true)}
          className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          + Report issue
        </button>
      </div>

      <div className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="maintenance-status-filter" className="block text-xs font-medium text-slate-500">
            Status
          </label>
          <select
            id="maintenance-status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">Any status</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label htmlFor="maintenance-priority-filter" className="block text-xs font-medium text-slate-500">
            Priority
          </label>
          <select
            id="maintenance-priority-filter"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">Any priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex items-end">
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setStatus(''); setPriority('') }}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <RequestList
        key={`${status}|${priority}|${refreshKey}`}
        status={status}
        priority={priority}
        manager={manager}
        hasFilters={hasFilters}
        busyId={busyId}
        onStartWork={startWork}
        onResolve={setResolveTarget}
      />

      {showRequest && (
        <MaintenanceRequestDialog
          facilities={facilities}
          onClose={() => setShowRequest(false)}
          onSaved={(message) => {
            setShowRequest(false)
            success(message || 'Maintenance request filed.')
            setRefreshKey((key) => key + 1)
          }}
        />
      )}

      {resolveTarget && (
        <ResolveDialog
          key={resolveTarget.id}
          request={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onSaved={handleResolved}
        />
      )}
    </div>
  )
}

function RequestList({
  status,
  priority,
  manager,
  hasFilters,
  busyId,
  onStartWork,
  onResolve
}) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (priority) params.set('priority', priority)

    const query = params.toString()

    api(`/maintenance${query ? `?${query}` : ''}`)
      .then((data) => {
        if (!active) return
        setRequests(data.requests)
        setError('')
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('Could not load maintenance requests. Please try again.')
        setLoading(false)
      })

    return () => { active = false }
  }, [status, priority])

  if (loading) {
    return <Loading label="Loading maintenance requests…" />
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-lg font-semibold text-slate-800">No maintenance requests</p>
        <p className="mt-1 text-sm text-slate-600">
          {hasFilters
            ? 'Nothing matches these filters.'
            : 'Everything is working — report an issue if something needs attention.'}
        </p>
      </div>
    )
  }

  const activeCount = requests.filter((request) =>
    ['open', 'in_progress'].includes(request.status)
  ).length

  return (
    <>
      <p className="mb-3 text-sm text-slate-500">
        {requests.length} {requests.length === 1 ? 'request' : 'requests'}
        {activeCount > 0 ? ` · ${activeCount} active` : ''}
      </p>

      <div className="space-y-3">
        {requests.map((request) => {
          const isActive = ['open', 'in_progress'].includes(request.status)

          return (
            <article key={request.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <MaintenanceStatusBadge status={request.status} />
                    <PriorityBadge priority={request.priority} />
                    <span className="text-xs text-slate-500">#{request.id}</span>
                  </div>
                  <h2 className="mt-2 font-semibold text-slate-900">{request.title}</h2>
                  <p className="text-sm font-medium text-slate-600">
                    {request.facility_title}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      facility is {request.facility_status}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {isActive && request.status === 'open' && (
                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() => onStartWork(request)}
                      className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                    >
                      {busyId === request.id ? 'Starting…' : 'Start work'}
                    </button>
                  )}
                  {manager && isActive && (
                    <button
                      type="button"
                      onClick={() => onResolve(request)}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Resolve / close
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
                {request.description}
              </p>

              <dl className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                <div>
                  <dt className="inline font-medium text-slate-600">Reported by</dt>{' '}
                  <dd className="inline">
                    {request.reported_by_name} · {formatDate(request.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-medium text-slate-600">Assigned to</dt>{' '}
                  <dd className="inline">{request.assigned_to_name || 'Unassigned'}</dd>
                </div>
              </dl>

              {request.resolution_notes && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <p className="text-xs font-semibold uppercase tracking-wide">Resolution</p>
                  <p className="mt-1">{request.resolution_notes}</p>
                  {request.resolved_at && (
                    <p className="mt-1 text-xs text-emerald-700">
                      Resolved {formatDate(request.resolved_at)}
                    </p>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}

function MaintenanceRequestDialog({ facilities, onClose, onSaved }) {
  const [form, setForm] = useState({
    facility_id: facilities[0] ? String(facilities[0].id) : '',
    title: '',
    description: '',
    priority: 'medium'
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    setSaving(true)
    try {
      const data = await api('/maintenance', {
        method: 'POST',
        body: {
          facility_id: Number(form.facility_id),
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority
        }
      })
      onSaved(data.message)
    } catch (err) {
      setFormError(err.message || 'Could not file this request. Please try again.')
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
        aria-labelledby="maintenance-dialog-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="maintenance-dialog-title" className="text-lg font-semibold text-slate-900">
          Report a maintenance issue
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          The facility is taken out of booking while the request is open or in progress.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
          {formError && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="maintenance-facility" className="block text-sm font-medium text-slate-700">
              Facility
            </label>
            <select
              id="maintenance-facility"
              value={form.facility_id}
              onChange={(event) => setForm({ ...form, facility_id: event.target.value })}
              className={`${inputClass} bg-white`}
            >
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.title}{facility.status === 'maintenance' ? ' (already in maintenance)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="maintenance-title" className="block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              id="maintenance-title"
              type="text"
              maxLength={150}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="e.g. Broken floodlight on court 2"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="maintenance-description" className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="maintenance-description"
              rows={4}
              maxLength={1000}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="What is wrong and where?"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="maintenance-priority" className="block text-sm font-medium text-slate-700">
              Priority
            </label>
            <select
              id="maintenance-priority"
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value })}
              className={`${inputClass} bg-white`}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
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
              disabled={saving || facilities.length === 0}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Filing…' : 'File request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ResolveDialog({ request, onClose, onSaved }) {
  const [status, setStatus] = useState('resolved')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (notes.trim().length < 3) {
      setFormError('Please add a short resolution note.')
      return
    }

    setSaving(true)
    try {
      const data = await api(`/maintenance/${request.id}`, {
        method: 'PUT',
        body: { status, resolution_notes: notes.trim() }
      })
      onSaved(data.message)
    } catch (err) {
      setFormError(err.message || 'Could not update this request. Please try again.')
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
        aria-labelledby="resolve-dialog-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="resolve-dialog-title" className="text-lg font-semibold text-slate-900">
          Finish “{request.title}”
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Resolving or closing returns {request.facility_title} to available once no other active request remains.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
          {formError && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="resolve-status" className="block text-sm font-medium text-slate-700">
              Outcome
            </label>
            <select
              id="resolve-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label htmlFor="resolve-notes" className="block text-sm font-medium text-slate-700">
              Resolution notes
            </label>
            <textarea
              id="resolve-notes"
              rows={4}
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What was fixed?"
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
              {saving ? 'Saving…' : 'Save outcome'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
