import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import Loading from '../components/Loading'
import MembershipPlanDialog from '../components/MembershipPlanDialog'
import { MembershipStatusBadge } from '../components/Phase3Badges'
import { formatPrice } from '../utils/format'
import { canManagePlans } from '../utils/roles'

const formatDay = (value) => {
  const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return '—'
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// Customers browse plans, subscribe and see their current membership.
// Managers/admins manage the plans and can cancel active memberships.
export default function MembershipsPage() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const manager = canManagePlans(user)
  const customer = user.role === 'customer'

  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [subscribingId, setSubscribingId] = useState(null)

  const [planDialog, setPlanDialog] = useState(null) // null | 'new' | plan
  const [deletePlan, setDeletePlan] = useState(null)
  const [cancelMembership, setCancelMembership] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true

    Promise.all([
      api('/membership-plans'),
      api('/memberships'),
      api('/memberships/mine')
    ])
      .then(([plansData, membershipsData, mineData]) => {
        if (!active) return
        setData({
          plans: plansData.plans,
          memberships: membershipsData.memberships,
          mine: mineData.membership
        })
        setLoadError('')
      })
      .catch(() => {
        if (!active) return
        setLoadError('Could not load memberships. Please try again.')
      })

    return () => { active = false }
  }, [refreshKey])

  const subscribe = async (plan) => {
    setSubscribingId(plan.id)
    try {
      const result = await api('/memberships', {
        method: 'POST',
        body: { plan_id: plan.id }
      })
      success(result.message || 'Membership activated.')
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not subscribe to this plan.')
    } finally {
      setSubscribingId(null)
    }
  }

  const removePlan = async () => {
    if (!deletePlan) return

    setBusy(true)
    try {
      await api(`/membership-plans/${deletePlan.id}`, { method: 'DELETE' })
      success(`${deletePlan.name} was deleted.`)
      setDeletePlan(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not delete this plan.')
      setDeletePlan(null)
    } finally {
      setBusy(false)
    }
  }

  const stopMembership = async () => {
    if (!cancelMembership) return

    setBusy(true)
    try {
      await api(`/memberships/${cancelMembership.id}/cancel`, { method: 'POST' })
      success('Membership cancelled.')
      setCancelMembership(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not cancel this membership.')
      setCancelMembership(null)
    } finally {
      setBusy(false)
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
    return <Loading label="Loading memberships…" />
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Memberships</h1>
          <p className="mt-1 text-slate-600">
            {manager
              ? 'Manage the plans customers can subscribe to and their active memberships.'
              : 'Save on every booking with a membership plan.'}
          </p>
        </div>
        {manager && (
          <button
            type="button"
            onClick={() => setPlanDialog('new')}
            className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + New plan
          </button>
        )}
      </div>

      {customer && (
        <CurrentMembership membership={data.mine} />
      )}

      {manager ? (
        <>
          <ManagerPlans
            plans={data.plans}
            onEdit={setPlanDialog}
            onDelete={setDeletePlan}
          />
          <ManagerMemberships
            memberships={data.memberships}
            onCancel={setCancelMembership}
          />
        </>
      ) : (
        <CustomerPlans
          plans={data.plans}
          hasActive={Boolean(data.mine)}
          subscribingId={subscribingId}
          onSubscribe={subscribe}
          memberships={data.memberships}
        />
      )}

      {planDialog && (
        <MembershipPlanDialog
          key={planDialog === 'new' ? 'new' : planDialog.id}
          plan={planDialog === 'new' ? null : planDialog}
          onClose={() => setPlanDialog(null)}
          onSaved={(savedPlan, wasEdit) => {
            setPlanDialog(null)
            success(wasEdit ? `${savedPlan.name} was updated.` : `${savedPlan.name} was created.`)
            setRefreshKey((key) => key + 1)
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deletePlan)}
        title="Delete this plan?"
        message="Customers will no longer be able to subscribe to it. Plans with existing memberships cannot be deleted."
        confirmLabel="Delete plan"
        busy={busy}
        onConfirm={removePlan}
        onCancel={() => setDeletePlan(null)}
      />

      <ConfirmDialog
        open={Boolean(cancelMembership)}
        title="Cancel this membership?"
        message="The customer keeps their history, but loses the booking discount immediately."
        confirmLabel="Cancel membership"
        busy={busy}
        onConfirm={stopMembership}
        onCancel={() => setCancelMembership(null)}
      />
    </div>
  )
}

function CurrentMembership({ membership }) {
  if (!membership) {
    return (
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">You are not a member yet</h2>
        <p className="mt-1 text-sm text-slate-600">
          Subscribe to a plan below and the discount is applied automatically to new bookings.
        </p>
      </div>
    )
  }

  return (
    <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Your active membership
          </p>
          <h2 className="mt-1 text-2xl font-bold text-emerald-900">{membership.plan_name}</h2>
          <p className="mt-1 text-sm text-emerald-800">
            {Number(membership.booking_discount_percent)}% off every new booking
          </p>
        </div>
        <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white">
          Active
        </span>
      </div>
      <p className="mt-4 text-sm text-emerald-800">
        Valid {formatDay(membership.starts_on)} – {formatDay(membership.ends_on)}
      </p>
    </div>
  )
}

function CustomerPlans({ plans, hasActive, subscribingId, onSubscribe, memberships }) {
  const activePlans = plans.filter((plan) => plan.is_active)

  return (
    <>
      <h2 className="mb-3 font-semibold text-slate-900">Plans</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activePlans.map((plan) => (
          <div key={plan.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{plan.name}</h3>
              <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                {Number(plan.booking_discount_percent)}% off
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {formatPrice(plan.price)}
              <span className="text-sm font-normal text-slate-500"> / {plan.duration_months} mo</span>
            </p>
            {plan.description && (
              <p className="mt-2 flex-1 text-sm text-slate-600">{plan.description}</p>
            )}
            <button
              type="button"
              disabled={hasActive || subscribingId === plan.id}
              onClick={() => onSubscribe(plan)}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {subscribingId === plan.id
                ? 'Subscribing…'
                : hasActive
                  ? 'Already a member'
                  : 'Subscribe'}
            </button>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-10 font-semibold text-slate-900">Your membership history</h2>
      {memberships.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          You have not subscribed to a plan yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Discount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberships.map((membership) => (
                <tr key={membership.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{membership.plan_name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDay(membership.starts_on)} – {formatDay(membership.ends_on)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {Number(membership.booking_discount_percent)}%
                  </td>
                  <td className="px-4 py-3">
                    <MembershipStatusBadge status={membership.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function ManagerPlans({ plans, onEdit, onDelete }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-semibold text-slate-900">Plans</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Duration</th>
              <th className="px-4 py-3 font-semibold">Discount</th>
              <th className="px-4 py-3 font-semibold">Available</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((plan) => (
              <tr key={plan.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{plan.name}</p>
                  {plan.description && (
                    <p className="mt-0.5 max-w-md text-xs text-slate-500">{plan.description}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{formatPrice(plan.price)}</td>
                <td className="px-4 py-3 text-slate-700">{plan.duration_months} mo</td>
                <td className="px-4 py-3 text-slate-700">
                  {Number(plan.booking_discount_percent)}%
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      plan.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(plan)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(plan)}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ManagerMemberships({ memberships, onCancel }) {
  return (
    <section>
      <h2 className="mb-3 font-semibold text-slate-900">Memberships</h2>
      {memberships.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No customer has subscribed to a plan yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberships.map((membership) => (
                <tr key={membership.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{membership.customer_name}</p>
                    <p className="text-xs text-slate-500">{membership.customer_email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <p>{membership.plan_name}</p>
                    <p className="text-xs text-slate-500">
                      {Number(membership.booking_discount_percent)}% off
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDay(membership.starts_on)} – {formatDay(membership.ends_on)}
                  </td>
                  <td className="px-4 py-3">
                    <MembershipStatusBadge status={membership.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {membership.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => onCancel(membership)}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
