import { useEffect, useState } from 'react'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import Loading from '../components/Loading'

// Category management (admin/manager): the categories used by the
// facility forms and the browse filters.
export default function CategoriesPage() {
  const { success, error } = useToast()

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Fresh load on every render cycle triggered by refreshKey
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true

    api('/categories')
      .then((data) => {
        if (!active) return
        setCategories(data.categories)
        setLoadError('')
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoadError('Could not load categories. Please try again.')
        setLoading(false)
      })

    return () => { active = false }
  }, [refreshKey])

  const handleCreate = async (event) => {
    event.preventDefault()
    setFormError('')

    const name = newName.trim()
    if (!name) {
      setFormError('Category name is required.')
      return
    }

    setCreating(true)
    try {
      await api('/categories', { method: 'POST', body: { name } })
      success(`Category "${name}" was created.`)
      setNewName('')
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setFormError(err.message || 'Could not create this category.')
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (category) => {
    setEditingId(category.id)
    setEditName(category.name)
  }

  const handleSaveEdit = async () => {
    const name = editName.trim()
    if (!name) {
      error('Category name is required.')
      return
    }

    setSavingEdit(true)
    try {
      await api(`/categories/${editingId}`, { method: 'PUT', body: { name } })
      success(`Category renamed to "${name}".`)
      setEditingId(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not rename this category.')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api(`/categories/${deleteTarget.id}`, { method: 'DELETE' })
      success(`Category "${deleteTarget.name}" was deleted.`)
      setDeleteTarget(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not delete this category.')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Categories</h1>
        <p className="mt-1 text-slate-600">
          The sport categories used to organise facilities. Categories still used by
          facilities cannot be deleted.
        </p>
      </div>

      {/* Create a new category */}
      <form
        onSubmit={handleCreate}
        className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
        noValidate
      >
        <div className="flex-1">
          <label htmlFor="new-category" className="sr-only">
            New category name
          </label>
          <input
            id="new-category"
            type="text"
            maxLength={100}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="e.g. Cricket"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
          {formError && <p className="mt-1 text-sm text-red-600">{formError}</p>}
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {creating ? 'Adding…' : '+ Add category'}
        </button>
      </form>

      {loading && <Loading label="Loading categories…" />}

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          {loadError}
        </div>
      )}

      {!loading && !loadError && categories.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-800">No categories yet</p>
          <p className="mt-1 text-sm text-slate-600">Add the first category above.</p>
        </div>
      )}

      {!loading && !loadError && categories.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Facilities</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-4 py-3">
                    {editingId === category.id ? (
                      <input
                        type="text"
                        maxLength={100}
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        aria-label="Category name"
                        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      />
                    ) : (
                      <span className="font-medium text-slate-900">{category.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {category.facility_count} {category.facility_count === 1 ? 'facility' : 'facilities'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {editingId === category.id ? (
                        <>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={savingEdit}
                            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {savingEdit ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(category)}
                            className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this category?"
        message={
          deleteTarget
            ? `This removes the "${deleteTarget.name}" category. Categories that are still used by facilities cannot be deleted.`
            : ''
        }
        confirmLabel="Delete category"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
