import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import FacilityCard from '../components/FacilityCard'
import Loading from '../components/Loading'
import { canManageContent } from '../utils/roles'

export default function FacilitiesPage() {
  const { user } = useAuth()

  // Filters
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')

  // Categories for the filter dropdown
  const [categories, setCategories] = useState([])

  useEffect(() => {
    let active = true

    api('/categories')
      .then((data) => { if (active) setCategories(data.categories) })
      .catch(() => {})

    return () => { active = false }
  }, [])

  // Debounce the search box so we do not query on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const hasFilters = search || categoryId || status

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setCategoryId('')
    setStatus('')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sport Facilities</h1>
          <p className="mt-1 text-slate-600">
            Browse all facilities, or narrow things down with the search and filters.
          </p>
        </div>
        {canManageContent(user) && (
          <Link
            to="/facilities/new"
            className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            + Add a facility
          </Link>
        )}
      </div>

      {/* Search and filters */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by keyword…"
            aria-label="Search facilities by keyword"
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          aria-label="Filter by category"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name} ({category.facility_count})
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by status"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">Any status</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
          <option value="maintenance">Under maintenance</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Clear
          </button>
        )}
      </div>

      {/* The key makes the results remount (fresh loading state)
          whenever the filters change */}
      <FacilityResults
        key={`${search}|${categoryId}|${status}`}
        search={search}
        categoryId={categoryId}
        status={status}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
      />
    </div>
  )
}

function FacilityResults({ search, categoryId, status, hasFilters, onClearFilters }) {
  const { user } = useAuth()
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (categoryId) params.set('category_id', categoryId)
    if (status) params.set('status', status)

    const query = params.toString()

    api(`/facilities${query ? `?${query}` : ''}`)
      .then((data) => {
        if (!active) return
        setFacilities(data.facilities)
        setError('')
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('Could not load facilities. Please try again.')
        setLoading(false)
      })

    return () => { active = false }
  }, [search, categoryId, status])

  if (loading) {
    return <Loading label="Loading facilities…" />
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    )
  }

  if (facilities.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-lg font-semibold text-slate-800">No facilities found</p>
        <p className="mt-1 text-sm text-slate-600">
          {hasFilters
            ? 'Nothing matches your search and filters. Try different keywords or clear the filters.'
            : 'There are no facilities yet. Be the first to add one!'}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          {hasFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Clear filters
            </button>
          )}
          {canManageContent(user) && (
            <Link
              to="/facilities/new"
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              + Add a facility
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <p className="mb-3 text-sm text-slate-500">
        {facilities.length} {facilities.length === 1 ? 'facility' : 'facilities'}
        {hasFilters ? ' matching your filters' : ''}
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {facilities.map((facility) => (
          <FacilityCard key={facility.id} facility={facility} />
        ))}
      </div>
    </>
  )
}
