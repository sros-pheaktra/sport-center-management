import { useEffect, useState } from 'react'
import { api } from '../api'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import Loading from '../components/Loading'
import { PromotionDialog } from '../components/Phase4Dialogs'
import { PromotionStateBadge } from '../components/Phase4Badges'

const formatDay = (value) => {
  const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return '—'
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const describeDiscount = (promotion) => (
  promotion.discount_type === 'percent'
    ? `${Number(promotion.discount_value)}% off`
    : `$${Number(promotion.discount_value).toFixed(2)} off`
)

// Manager/admin management of the promo codes customers redeem at checkout.
export default function PromotionsPage() {
  const { success, error } = useToast()

  const [promotions, setPromotions] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [dialog, setDialog] = useState(null) // null | 'new' | promotion
  const [deletePromotion, setDeletePromotion] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true

    api('/promotions')
      .then((data) => {
        if (!active) return
        setPromotions(data.promotions)
        setLoadError('')
      })
      .catch(() => {
        if (!active) return
        setLoadError('Could not load promotions. Please try again.')
      })

    return () => { active = false }
  }, [refreshKey])

  const remove = async () => {
    if (!deletePromotion) return

    setBusy(true)
    try {
      await api(`/promotions/${deletePromotion.id}`, { method: 'DELETE' })
      success(`${deletePromotion.code} was deleted.`)
      setDeletePromotion(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not delete this promotion.')
      setDeletePromotion(null)
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

  if (!promotions) {
    return <Loading label="Loading promotions…" />
  }

  const redeemable = promotions.filter((promotion) => promotion.is_redeemable).length

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Promotions</h1>
          <p className="mt-1 text-slate-600">
            Discount codes customers can apply at checkout, on top of any membership
            discount. {redeemable} of {promotions.length} codes are redeemable now.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialog('new')}
          className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + New code
        </button>
      </div>

      {promotions.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
          No promotion codes have been created yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Discount</th>
                <th className="px-4 py-3 font-semibold">Valid period</th>
                <th className="px-4 py-3 font-semibold">Usage</th>
                <th className="px-4 py-3 font-semibold">State</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {promotions.map((promotion) => (
                <tr key={promotion.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-mono text-sm font-bold text-slate-900">{promotion.code}</p>
                    <p className="mt-0.5 font-medium text-slate-700">{promotion.title}</p>
                    {promotion.description && (
                      <p className="mt-0.5 max-w-xs text-xs text-slate-500">
                        {promotion.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{describeDiscount(promotion)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDay(promotion.valid_from)} – {formatDay(promotion.valid_until)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {promotion.used_count}
                    {promotion.usage_limit === null
                      ? ' used · unlimited'
                      : ` / ${promotion.usage_limit} used`}
                  </td>
                  <td className="px-4 py-3">
                    <PromotionStateBadge promotion={promotion} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDialog(promotion)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletePromotion(promotion)}
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
      )}

      {dialog && (
        <PromotionDialog
          key={dialog === 'new' ? 'new' : dialog.id}
          promotion={dialog === 'new' ? null : dialog}
          onClose={() => setDialog(null)}
          onSaved={(saved, wasEdit) => {
            setDialog(null)
            success(wasEdit ? `${saved.code} was updated.` : `${saved.code} was created.`)
            setRefreshKey((key) => key + 1)
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deletePromotion)}
        title="Delete this promotion?"
        message="The code will stop working immediately. Codes that have already been used must be deactivated instead."
        confirmLabel="Delete code"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeletePromotion(null)}
      />
    </div>
  )
}
