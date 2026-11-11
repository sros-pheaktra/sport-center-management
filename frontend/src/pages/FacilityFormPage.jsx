import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
import Loading from '../components/Loading'
import FacilityImage from '../components/FacilityImage'
import { formatTime } from '../utils/format'

const MAX_IMAGE_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png']

const emptyForm = {
  title: '',
  description: '',
  category_id: '',
  status: 'available',
  price_per_hour: '',
  capacity: '',
  open_time: '08:00',
  close_time: '22:00'
}

export default function FacilityFormPage({ mode }) {
  const { id } = useParams()
  const isEdit = mode === 'edit'

  // In edit mode the key remounts the form (fresh loading state)
  // when the id in the URL changes
  if (!isEdit) {
    return <FacilityForm mode="create" id={null} />
  }

  return <FacilityForm key={id} mode="edit" id={id} />
}

function FacilityForm({ mode, id }) {
  const isEdit = mode === 'edit'
  const { success, error: toastError } = useToast()
  const navigate = useNavigate()

  const [facility, setFacility] = useState(null) // existing record (edit mode)
  const [form, setForm] = useState(emptyForm)
  const [categories, setCategories] = useState([])
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [notFound, setNotFound] = useState(false)

  // Load categories for the dropdown
  useEffect(() => {
    let active = true

    api('/categories')
      .then((data) => { if (active) setCategories(data.categories) })
      .catch(() => {})

    return () => { active = false }
  }, [])

  // In edit mode, load the existing facility
  useEffect(() => {
    if (!isEdit) return

    let active = true

    api(`/facilities/${id}`)
      .then((data) => {
        if (!active) return
        setFacility(data.facility)
        setForm({
          title: data.facility.title,
          description: data.facility.description,
          category_id: String(data.facility.category_id),
          status: data.facility.status,
          price_per_hour: String(data.facility.price_per_hour ?? ''),
          capacity: data.facility.capacity == null ? '' : String(data.facility.capacity),
          open_time: formatTime(data.facility.open_time) || '08:00',
          close_time: formatTime(data.facility.close_time) || '22:00'
        })
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        if (err.status === 404) setNotFound(true)
        else toastError('Could not load this facility.')
        setLoading(false)
      })

    return () => { active = false }
  }, [id, isEdit, toastError])

  // Basic client-side checks; the server validates everything again
  const validate = () => {
    const errors = {}

    if (!form.title.trim()) errors.title = 'Title is required.'
    else if (form.title.trim().length > 150) errors.title = 'Title must be 150 characters or fewer.'

    if (!form.description.trim()) errors.description = 'Description is required.'

    if (!form.category_id) errors.category_id = 'Please choose a category.'

    const price = Number(form.price_per_hour)
    if (form.price_per_hour === '' || !Number.isFinite(price) || price < 0) {
      errors.price_per_hour = 'Enter a valid hourly price (0 or more).'
    }

    if (form.capacity !== '') {
      const capacity = Number(form.capacity)
      if (!Number.isInteger(capacity) || capacity < 1) {
        errors.capacity = 'Capacity must be a whole number of at least 1.'
      }
    }

    if (form.close_time && form.open_time && form.close_time <= form.open_time) {
      errors.close_time = 'Closing time must be after opening time.'
    }

    return errors
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    setFieldErrors((current) => ({ ...current, image: '' }))

    if (!file) {
      setImageFile(null)
      setPreviewUrl(null)
      return
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFieldErrors((current) => ({
        ...current,
        image: 'Image must be a JPEG or PNG file.'
      }))
      event.target.value = ''
      setImageFile(null)
      setPreviewUrl(null)
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setFieldErrors((current) => ({
        ...current,
        image: 'Image must be 2 MB or smaller.'
      }))
      event.target.value = ''
      setImageFile(null)
      setPreviewUrl(null)
      return
    }

    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const body = new FormData()
    body.set('title', form.title.trim())
    body.set('description', form.description.trim())
    body.set('category_id', form.category_id)
    body.set('status', form.status)
    body.set('price_per_hour', form.price_per_hour)
    if (form.capacity !== '') {
      body.set('capacity', form.capacity)
    }
    body.set('open_time', form.open_time)
    body.set('close_time', form.close_time)
    if (imageFile) {
      body.set('image', imageFile)
    }

    setSaving(true)
    try {
      const data = isEdit
        ? await api(`/facilities/${facility.id}`, { method: 'PUT', body })
        : await api('/facilities', { method: 'POST', body })

      success(isEdit ? 'Facility updated successfully.' : 'Facility created successfully.')
      navigate(`/facilities/${data.facility.id}`)
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Loading label="Loading…" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-800">Facility not found</h1>
        <p className="mt-2 text-slate-600">
          This facility does not exist — it may have been deleted.
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">
        {isEdit ? 'Edit facility' : 'Add a new facility'}
      </h1>
      <p className="mt-1 text-slate-600">
        {isEdit
          ? 'Update the details below. Leave the image empty to keep the current photo.'
          : 'Fill in the details to add the facility to the center.'}
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        noValidate
      >
        {formError && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            maxLength={150}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="e.g. Riverside Futsal Arena"
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              fieldErrors.title
                ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
            }`}
          />
          {fieldErrors.title && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.title}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            rows={5}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="What makes this facility great? Courts, equipment, opening hours…"
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              fieldErrors.description
                ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
            }`}
          />
          {fieldErrors.description && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.description}</p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-slate-700">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category_id"
              value={form.category_id}
              onChange={(event) => setForm({ ...form, category_id: event.target.value })}
              className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                fieldErrors.category_id
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                  : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
              }`}
            >
              <option value="">Choose a category…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {fieldErrors.category_id && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.category_id}</p>
            )}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
              <option value="maintenance">Under maintenance</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Facilities under maintenance cannot be booked.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="price_per_hour" className="block text-sm font-medium text-slate-700">
              Price per hour <span className="text-red-500">*</span>
            </label>
            <input
              id="price_per_hour"
              type="number"
              min="0"
              max="99999.99"
              step="0.01"
              value={form.price_per_hour}
              onChange={(event) => setForm({ ...form, price_per_hour: event.target.value })}
              placeholder="e.g. 25.00"
              className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                fieldErrors.price_per_hour
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                  : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
              }`}
            />
            {fieldErrors.price_per_hour && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.price_per_hour}</p>
            )}
          </div>

          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-slate-700">
              Capacity <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="capacity"
              type="number"
              min="1"
              step="1"
              value={form.capacity}
              onChange={(event) => setForm({ ...form, capacity: event.target.value })}
              placeholder="e.g. 12 players"
              className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                fieldErrors.capacity
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                  : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
              }`}
            />
            {fieldErrors.capacity && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.capacity}</p>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="open_time" className="block text-sm font-medium text-slate-700">
              Opens at <span className="text-red-500">*</span>
            </label>
            <input
              id="open_time"
              type="time"
              value={form.open_time}
              onChange={(event) => setForm({ ...form, open_time: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label htmlFor="close_time" className="block text-sm font-medium text-slate-700">
              Closes at <span className="text-red-500">*</span>
            </label>
            <input
              id="close_time"
              type="time"
              value={form.close_time}
              onChange={(event) => setForm({ ...form, close_time: event.target.value })}
              className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                fieldErrors.close_time
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                  : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
              }`}
            />
            {fieldErrors.close_time && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.close_time}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium text-slate-700">
            Image <span className="text-slate-400">(optional — JPEG or PNG, max 2 MB)</span>
          </label>
          <input
            id="image"
            type="file"
            accept="image/jpeg, image/png"
            onChange={handleImageChange}
            className="mt-1 w-full cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
          />
          {fieldErrors.image && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.image}</p>
          )}

          {/* Preview of the chosen image, or the current one in edit mode */}
          {previewUrl && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-slate-500">New image preview</p>
              <img
                src={previewUrl}
                alt="Selected upload preview"
                className="h-32 w-full max-w-xs rounded-md border border-slate-200 object-cover"
              />
            </div>
          )}
          {!previewUrl && isEdit && facility?.image && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-slate-500">Current image (kept unless you choose a new one)</p>
              <FacilityImage
                image={facility.image}
                title={facility.title}
                className="h-32 w-full max-w-xs rounded-md border border-slate-200"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Link
            to={isEdit ? `/facilities/${facility.id}` : '/'}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create facility'}
          </button>
        </div>
      </form>
    </div>
  )
}
