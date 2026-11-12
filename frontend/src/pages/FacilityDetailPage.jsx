import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import StatusBadge from '../components/StatusBadge'
import FacilityImage from '../components/FacilityImage'
import ConfirmDialog from '../components/ConfirmDialog'
import Loading from '../components/Loading'
import { formatDate, formatPrice, formatTime } from '../utils/format'
import { canManageContent } from '../utils/roles'

export default function FacilityDetailPage() {
  const { id } = useParams()

  // The key remounts the detail (fresh loading state) when the
  // id in the URL changes
  return <FacilityDetail key={id} id={id} />
}

function FacilityDetail({ id }) {
  const { user } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()

  const [facility, setFacility] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true

    api(`/facilities/${id}`)
      .then((data) => {
        if (!active) return
        setFacility(data.facility)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        if (err.status === 404) setNotFound(true)
        else setLoadError('Could not load this facility. Please try again.')
        setLoading(false)
      })

    return () => { active = false }
  }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api(`/facilities/${facility.id}`, { method: 'DELETE' })
      success(`"${facility.title}" was deleted.`)
      navigate('/')
    } catch (err) {
      error(err.message || 'Could not delete this facility.')
      setConfirmOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <Loading label="Loading facility…" />
  }

  // Friendly response for a missing record
  if (notFound) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-5xl font-bold text-slate-300">404</h1>
        <h2 className="mt-3 text-xl font-semibold text-slate-800">Facility not found</h2>
        <p className="mt-2 text-slate-600">
          This facility does not exist — it may have been deleted by its owner.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          ← Back to all facilities
        </Link>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="py-16 text-center">
        <p className="text-red-700">{loadError}</p>
      </div>
    )
  }

  const canManage = canManageContent(user)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/" className="text-sm font-medium text-emerald-700 hover:underline">
        ← Back to all facilities
      </Link>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid md:grid-cols-2">
          <FacilityImage
            image={facility.image}
            title={facility.title}
            className="aspect-video w-full md:aspect-auto md:h-full"
          />

          <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{facility.title}</h1>
              <StatusBadge status={facility.status} />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 font-medium text-sky-700">
                {facility.category_name}
              </span>
              <span>listed by {facility.owner_name}</span>
            </div>

            {/* Pricing and booking details */}
            <dl className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-4 text-center">
              <div>
                <dt className="text-xs text-slate-500">Price</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">
                  {formatPrice(facility.price_per_hour)}
                  <span className="font-normal text-slate-500">/hour</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Capacity</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">
                  {facility.capacity ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Open hours</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">
                  {formatTime(facility.open_time)}–{formatTime(facility.close_time)}
                </dd>
              </div>
            </dl>

            {/* Primary customer action: start the booking flow */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-emerald-900">Book this facility</p>
                  <p className="text-sm text-emerald-800">
                    {formatPrice(facility.price_per_hour)} per hour · {formatTime(facility.open_time)}–{formatTime(facility.close_time)}
                  </p>
                </div>

                {facility.status === 'available' ? (
                  user ? (
                    <Link
                      to={`/facilities/${facility.id}/book`}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Choose a time →
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      state={{ from: `/facilities/${facility.id}/book` }}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Log in to book
                    </Link>
                  )
                ) : (
                  <span className="rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500">
                    Not bookable right now
                  </span>
                )}
              </div>
            </div>

            <p className="description-text text-slate-700">{facility.description}</p>

            <div className="mt-auto border-t border-slate-100 pt-4 text-xs text-slate-400">
              Added {formatDate(facility.created_at)}
              {facility.updated_at !== facility.created_at && (
                <> · last updated {formatDate(facility.updated_at)}</>
              )}
            </div>

            {/* Only admins and managers see these — the server
                re-checks the role on every write anyway */}
            {canManage && (
              <div className="flex gap-3">
                <Link
                  to={`/facilities/${facility.id}/edit`}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  ✏️ Edit
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  🗑 Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deletion must be confirmed in the interface */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this facility?"
        message={`This will permanently remove "${facility.title}" and its photo. This action cannot be undone.`}
        confirmLabel="Delete facility"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
