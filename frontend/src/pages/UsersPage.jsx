import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import Loading from '../components/Loading'
import RoleBadge from '../components/RoleBadge'
import UserDialog from '../components/UserDialog'
import { formatDate } from '../utils/format'
import { isAdmin, canManageUsers } from '../utils/roles'

// User & staff management (admin: every account · manager: staff only)
export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const { success, error } = useToast()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')

  const [dialogUser, setDialogUser] = useState(null) // null = closed
  const [dialogKey, setDialogKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Debounce the search box so we do not query on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const openCreate = () => {
    setDialogUser('new')
    setDialogKey((key) => key + 1)
  }

  const openEdit = (user) => {
    setDialogUser(user)
    setDialogKey((key) => key + 1)
  }

  const closeDialog = () => setDialogUser(null)

  const handleSaved = (savedUser, wasEdit) => {
    closeDialog()
    success(wasEdit ? `${savedUser.full_name} was updated.` : `${savedUser.full_name} was created.`)
    setRefreshKey((key) => key + 1)
  }

  const handleToggleActive = async (user) => {
    try {
      await api(`/users/${user.id}`, {
        method: 'PUT',
        body: {
          full_name: user.full_name,
          email: user.email,
          phone: user.phone || '',
          is_active: !user.is_active
        }
      })
      success(
        user.is_active
          ? `${user.full_name} was deactivated. They can no longer log in.`
          : `${user.full_name} was reactivated.`
      )
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not update this account.')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api(`/users/${deleteTarget.id}`, { method: 'DELETE' })
      success(`${deleteTarget.full_name} was deleted.`)
      setDeleteTarget(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not delete this account.')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const roleFilterOptions = isAdmin(currentUser)
    ? [
        { value: '', label: 'All roles' },
        { value: 'admin', label: 'Admins' },
        { value: 'manager', label: 'Managers' },
        { value: 'staff', label: 'Staff' },
        { value: 'customer', label: 'Customers' }
      ]
    : [
        { value: '', label: 'All roles' },
        { value: 'manager', label: 'Managers' },
        { value: 'staff', label: 'Staff' },
        { value: 'customer', label: 'Customers' }
      ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Users &amp; staff</h1>
          <p className="mt-1 text-slate-600">
            {isAdmin(currentUser)
              ? 'Manage every account in the system — roles, passwords and status.'
              : 'Manage the staff accounts of the center.'}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + New account
        </button>
      </div>

      {/* Search and filters */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name or email…"
          aria-label="Search accounts"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          aria-label="Filter by role"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {roleFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* The key remounts the list (fresh loading state) whenever the
          filters change or an account was saved/deleted */}
      <UsersResults
        key={`${search}|${role}|${refreshKey}`}
        search={search}
        role={role}
        onEdit={openEdit}
        onToggleActive={handleToggleActive}
        onDelete={setDeleteTarget}
      />

      {dialogUser && (
        <UserDialog
          key={dialogKey}
          user={dialogUser === 'new' ? null : dialogUser}
          onClose={closeDialog}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this account?"
        message={`This permanently removes ${deleteTarget?.full_name} (${deleteTarget?.email}) and everything they created. This action cannot be undone.`}
        confirmLabel="Delete account"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function UsersResults({ search, role, onEdit, onToggleActive, onDelete }) {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (role) params.set('role', role)

    const query = params.toString()

    api(`/users${query ? `?${query}` : ''}`)
      .then((data) => {
        if (!active) return
        setUsers(data.users)
        setError('')
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('Could not load accounts. Please try again.')
        setLoading(false)
      })

    return () => { active = false }
  }, [search, role])

  if (loading) {
    return <Loading label="Loading accounts…" />
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-lg font-semibold text-slate-800">No accounts found</p>
        <p className="mt-1 text-sm text-slate-600">
          {search || role
            ? 'Nothing matches your search and filters. Try different keywords or clear them.'
            : 'There are no accounts yet.'}
        </p>
      </div>
    )
  }

  const adminViewer = canManageUsers(currentUser) && isAdmin(currentUser)
  const managerViewer = canManageUsers(currentUser) && currentUser.role === 'manager'

  return (
    <>
      <p className="mb-3 text-sm text-slate-500">
        {users.length} {users.length === 1 ? 'account' : 'accounts'}
        {search || role ? ' matching your filters' : ''}
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => {
              const isSelf = user.id === currentUser.id
              // Managers may only edit staff accounts (server re-checks)
              const canEditRow = managerViewer ? user.role === 'staff' : true

              return (
                <tr key={user.id} className={user.is_active ? '' : 'bg-slate-50/60'}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {user.full_name}
                      {isSelf && <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>}
                    </p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.phone || '—'}</td>
                  <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Deactivated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {canEditRow && (
                        <button
                          type="button"
                          onClick={() => onEdit(user)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                      )}
                      {adminViewer && !isSelf && (
                        <button
                          type="button"
                          onClick={() => onToggleActive(user)}
                          className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                        >
                          {user.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                      {adminViewer && !isSelf && (
                        <button
                          type="button"
                          onClick={() => onDelete(user)}
                          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
