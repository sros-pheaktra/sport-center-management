import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import Loading from '../components/Loading'
import { EquipmentDialog, RentEquipmentDialog } from '../components/Phase4Dialogs'
import {
  EquipmentConditionBadge,
  EquipmentStatusBadge,
  RentalStatusBadge
} from '../components/Phase4Badges'
import { formatPrice } from '../utils/format'
import { canManageContent, isStaffSide } from '../utils/roles'

const formatWhen = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Public equipment catalogue + the signed-in customer's rentals.
// Staff-side roles see every rental and can take returns at the desk.
export default function EquipmentPage() {
  const { user } = useAuth()
  const { success, error } = useToast()

  const manager = canManageContent(user)
  const staff = isStaffSide(user)
  const customer = user?.role === 'customer'

  const [equipment, setEquipment] = useState(null)
  const [rentals, setRentals] = useState([])
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [dialogItem, setDialogItem] = useState(null) // null | 'new' | item
  const [rentItem, setRentItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [returning, setReturning] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true

    api('/equipment')
      .then((data) => {
        if (!active) return
        setEquipment(data.equipment)
        setLoadError('')
      })
      .catch(() => {
        if (!active) return
        setLoadError('Could not load the equipment catalogue. Please try again.')
      })

    return () => { active = false }
  }, [refreshKey])

  useEffect(() => {
    if (!user) return

    let active = true

    api(`/rentals${staff ? '' : '?mine=1'}`)
      .then((data) => {
        if (active) setRentals(data.rentals)
      })
      .catch(() => {})

    return () => { active = false }
  }, [user, staff, refreshKey])

  const removeItem = async () => {
    if (!deleteItem) return

    setBusy(true)
    try {
      await api(`/equipment/${deleteItem.id}`, { method: 'DELETE' })
      success(`"${deleteItem.name}" was deleted.`)
      setDeleteItem(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not delete this item.')
      setDeleteItem(null)
    } finally {
      setBusy(false)
    }
  }

  const returnRental = async () => {
    if (!returning) return

    setBusy(true)
    try {
      const data = await api(`/rentals/${returning.id}/return`, { method: 'POST' })
      success(data.message || 'Rental returned.')
      setReturning(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not return this rental.')
      setReturning(null)
    } finally {
      setBusy(false)
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          {loadError}
        </div>
      </div>
    )
  }

  if (!equipment) {
    return <Loading label="Loading equipment…" />
  }

  const needle = search.trim().toLowerCase()
  const visible = equipment.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false
    if (!needle) return true
    return `${item.name} ${item.description || ''}`.toLowerCase().includes(needle)
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Equipment rental</h1>
          <p className="mt-1 text-slate-600">
            Borrow rackets, balls, bibs and more for your session — pick it up and
            return it at the front desk.
          </p>
        </div>
        {manager && (
          <button
            type="button"
            onClick={() => setDialogItem('new')}
            className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            + New item
          </button>
        )}
      </div>

      <div className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_200px]">
        <div>
          <label htmlFor="equipment-search" className="block text-xs font-medium text-slate-500">
            Search
          </label>
          <input
            id="equipment-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Racket, football, bibs…"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <div>
          <label htmlFor="equipment-status-filter" className="block text-xs font-medium text-slate-500">
            Status
          </label>
          <select
            id="equipment-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="rented">Rented</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          No equipment matches these filters.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <article
              key={item.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-slate-900">{item.name}</h2>
                <EquipmentStatusBadge status={item.status} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <EquipmentConditionBadge condition={item.item_condition} />
                {Number(item.active_rentals) > 0 && (
                  <span className="text-xs text-slate-500">
                    {item.active_rentals} out on loan
                  </span>
                )}
              </div>

              {item.description && (
                <p className="mt-3 flex-1 text-sm text-slate-600">{item.description}</p>
              )}

              <p className="mt-4 text-2xl font-bold text-slate-900">
                {formatPrice(item.rental_fee)}
                <span className="text-sm font-normal text-slate-500"> / day</span>
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {customer && item.status === 'available' && (
                  <button
                    type="button"
                    onClick={() => setRentItem(item)}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Rent this item
                  </button>
                )}

                {customer && item.status !== 'available' && (
                  <span className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
                    Not available
                  </span>
                )}

                {!user && item.status === 'available' && (
                  <Link
                    to="/login"
                    state={{ from: '/equipment' }}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Log in to rent
                  </Link>
                )}

                {manager && (
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDialogItem(item)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteItem(item)}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {user && (staff || rentals.length > 0) && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold text-slate-900">
            {staff ? 'All rentals' : 'Your rentals'}
          </h2>

          {rentals.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              No equipment is currently rented.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    {staff && <th className="px-4 py-3 font-semibold">Customer</th>}
                    <th className="px-4 py-3 font-semibold">Due back</th>
                    <th className="px-4 py-3 font-semibold">Fee</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rentals.map((rental) => (
                    <tr key={rental.id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{rental.equipment_name}</p>
                        <p className="text-xs text-slate-500">
                          Rented {formatWhen(rental.rented_at)}
                        </p>
                      </td>
                      {staff && (
                        <td className="px-4 py-3">
                          <p className="text-slate-700">{rental.customer_name}</p>
                          <p className="text-xs text-slate-500">{rental.customer_email}</p>
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-600">
                        {formatWhen(rental.due_at)}
                        {rental.returned_at && (
                          <p className="text-xs text-slate-500">
                            Returned {formatWhen(rental.returned_at)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatPrice(rental.fee)}</td>
                      <td className="px-4 py-3">
                        <RentalStatusBadge status={rental.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {staff && ['rented', 'overdue'].includes(rental.status) ? (
                          <button
                            type="button"
                            onClick={() => setReturning(rental)}
                            className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                          >
                            Return item
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {dialogItem && (
        <EquipmentDialog
          key={dialogItem === 'new' ? 'new' : dialogItem.id}
          item={dialogItem === 'new' ? null : dialogItem}
          onClose={() => setDialogItem(null)}
          onSaved={(saved, wasEdit) => {
            setDialogItem(null)
            success(wasEdit ? `${saved.name} was updated.` : `${saved.name} was added.`)
            setRefreshKey((key) => key + 1)
          }}
        />
      )}

      {rentItem && (
        <RentEquipmentDialog
          key={rentItem.id}
          item={rentItem}
          onClose={() => setRentItem(null)}
          onRented={(rental, message) => {
            setRentItem(null)
            success(message || 'Equipment rented.')
            setRefreshKey((key) => key + 1)
            return rental
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteItem)}
        title="Delete this equipment?"
        message="Customers will no longer be able to rent it. Items with an active rental cannot be deleted."
        confirmLabel="Delete item"
        busy={busy}
        onConfirm={removeItem}
        onCancel={() => setDeleteItem(null)}
      />

      <ConfirmDialog
        open={Boolean(returning)}
        title="Return this item?"
        message="This marks the rental as returned and puts the item back in the available pool."
        confirmLabel="Return item"
        busy={busy}
        onConfirm={returnRental}
        onCancel={() => setReturning(null)}
      />
    </div>
  )
}
