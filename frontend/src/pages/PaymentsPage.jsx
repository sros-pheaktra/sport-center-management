import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import Loading from '../components/Loading'
import { PaymentStatusBadge } from '../components/ReservationStatusBadge'
import { InvoiceStatusBadge } from '../components/Phase3Badges'
import { formatPrice } from '../utils/format'
import { formatBookingDate, formatBookingTime } from '../utils/reservation'
import { canRefundPayments } from '../utils/roles'

const METHOD_LABELS = {
  online: 'Online',
  at_center: 'At the center'
}

// Staff-side payments overview: filter the ledger, record at-center
// payments, refund paid ones and jump to printable invoices.
export default function PaymentsPage() {
  const { user } = useAuth()
  const { success, error } = useToast()

  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [date, setDate] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [refundTarget, setRefundTarget] = useState(null)
  const [refunding, setRefunding] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const hasFilters = status || method || date

  const clearFilters = () => {
    setStatus('')
    setMethod('')
    setDate('')
  }

  const recordPayment = async (payment) => {
    setBusyId(payment.id)
    try {
      const data = await api(`/payments/${payment.id}/record`, { method: 'POST' })
      success(data.message || 'Payment recorded.')
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not record this payment.')
    } finally {
      setBusyId(null)
    }
  }

  const refundPayment = async () => {
    if (!refundTarget) return

    setRefunding(true)
    try {
      const data = await api(`/payments/${refundTarget.id}/refund`, { method: 'POST' })
      success(data.message || 'Payment refunded.')
      setRefundTarget(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      error(err.message || 'Could not refund this payment.')
      setRefundTarget(null)
    } finally {
      setRefunding(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Payments</h1>
        <p className="mt-1 text-slate-600">
          Every online and at-center payment, with its invoice and booking.
        </p>
      </div>

      <div className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="payment-status-filter" className="block text-xs font-medium text-slate-500">
            Status
          </label>
          <select
            id="payment-status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Any status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div>
          <label htmlFor="payment-method-filter" className="block text-xs font-medium text-slate-500">
            Method
          </label>
          <select
            id="payment-method-filter"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Any method</option>
            <option value="online">Online</option>
            <option value="at_center">At the center</option>
          </select>
        </div>

        <div>
          <label htmlFor="payment-date-filter" className="block text-xs font-medium text-slate-500">
            Created on
          </label>
          <input
            id="payment-date-filter"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="flex items-end gap-2">
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
      </div>

      <PaymentResults
        key={`${status}|${method}|${date}|${refreshKey}`}
        status={status}
        method={method}
        date={date}
        hasFilters={hasFilters}
        canRefund={canRefundPayments(user)}
        busyId={busyId}
        onRecord={recordPayment}
        onRefund={setRefundTarget}
        onClearFilters={clearFilters}
      />

      <ConfirmDialog
        open={Boolean(refundTarget)}
        title="Refund this payment?"
        message="The payment will be refunded, its invoice voided and any active booking cancelled. This cannot be undone."
        confirmLabel="Refund payment"
        busy={refunding}
        onConfirm={refundPayment}
        onCancel={() => setRefundTarget(null)}
      />
    </div>
  )
}

function PaymentResults({
  status,
  method,
  date,
  hasFilters,
  canRefund,
  busyId,
  onRecord,
  onRefund,
  onClearFilters
}) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (method) params.set('method', method)
    if (date) params.set('date', date)

    const query = params.toString()

    api(`/payments${query ? `?${query}` : ''}`)
      .then((data) => {
        if (!active) return
        setPayments(data.payments)
        setError('')
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('Could not load payments. Please try again.')
        setLoading(false)
      })

    return () => { active = false }
  }, [status, method, date])

  if (loading) {
    return <Loading label="Loading payments…" />
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-lg font-semibold text-slate-800">No payments found</p>
        <p className="mt-1 text-sm text-slate-600">
          {hasFilters
            ? 'Nothing matches these filters. Try clearing them.'
            : 'Payments appear here as soon as bookings are made.'}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-5 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Clear filters
          </button>
        )}
      </div>
    )
  }

  const pendingTotal = payments
    .filter((payment) => payment.status === 'pending')
    .reduce((sum, payment) => sum + Number(payment.amount), 0)

  return (
    <>
      <p className="mb-3 text-sm text-slate-500">
        {payments.length} {payments.length === 1 ? 'payment' : 'payments'}
        {pendingTotal > 0 ? ` · ${formatPrice(pendingTotal)} still pending` : ''}
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Booking</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Session</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Invoice</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((payment) => (
              <tr key={payment.id} className="align-top">
                <td className="px-4 py-3">
                  <Link
                    to={`/bookings/${payment.reference}`}
                    className="font-mono text-xs font-semibold text-blue-700 hover:underline"
                  >
                    {payment.reference}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">{payment.facility_title}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{payment.customer_name}</p>
                  <p className="text-xs text-slate-500">{payment.customer_email}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  <p>{formatBookingDate(payment.starts_at)}</p>
                  <p className="text-xs text-slate-500">
                    {formatBookingTime(payment.starts_at)}–{formatBookingTime(payment.ends_at)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{formatPrice(payment.amount)}</p>
                  <p className="text-xs text-slate-500">
                    {METHOD_LABELS[payment.method] || payment.method}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <PaymentStatusBadge status={payment.status} />
                </td>
                <td className="px-4 py-3">
                  {payment.invoice_id ? (
                    <div className="space-y-1">
                      <Link
                        to={`/invoices/${payment.invoice_id}`}
                        className="font-mono text-xs font-medium text-blue-700 hover:underline"
                      >
                        {payment.invoice_number}
                      </Link>
                      <div><InvoiceStatusBadge status={payment.invoice_status} /></div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {payment.status === 'pending' && (
                      <button
                        type="button"
                        disabled={busyId === payment.id}
                        onClick={() => onRecord(payment)}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {busyId === payment.id ? 'Recording…' : 'Record payment'}
                      </button>
                    )}
                    {payment.status === 'paid' && canRefund && (
                      <button
                        type="button"
                        onClick={() => onRefund(payment)}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Refund
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
