import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import Loading from '../components/Loading'
import { InvoiceStatusBadge } from '../components/Phase3Badges'
import { formatDate, formatPrice } from '../utils/format'
import { formatBookingDate, formatBookingTime } from '../utils/reservation'

const METHOD_LABELS = {
  online: 'Online payment',
  at_center: 'Pay at the center'
}

// Printable invoice for a booking. Customers can only open their
// own invoices; staff-side roles can open any.
export default function InvoicePage() {
  const { id } = useParams()

  return <Invoice key={id} invoiceId={id} />
}

function Invoice({ invoiceId }) {
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true

    api(`/invoices/${invoiceId}`)
      .then((data) => {
        if (!active) return
        setInvoice(data.invoice)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        if (err.status === 404) setNotFound(true)
        else if (err.status === 403) setLoadError('You do not have permission to view this invoice.')
        else setLoadError('Could not load this invoice. Please try again.')
        setLoading(false)
      })

    return () => { active = false }
  }, [invoiceId])

  if (loading) {
    return <Loading label="Loading invoice…" />
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-800">Invoice not found</h1>
        <p className="mt-2 text-slate-600">It may have been removed with its booking.</p>
        <Link to="/bookings" className="mt-6 inline-block text-sm font-medium text-emerald-700 hover:underline">
          ← Back to bookings
        </Link>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-red-700">{loadError}</p>
        <Link to="/bookings" className="mt-6 inline-block text-sm font-medium text-emerald-700 hover:underline">
          ← Back to bookings
        </Link>
      </div>
    )
  }

  const subtotal = Number(invoice.subtotal)
  const discount = Number(invoice.discount_amount)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to={`/bookings/${invoice.reference}`}
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Back to booking {invoice.reference}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
        >
          Print invoice
        </button>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Sport Center
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Invoice</h1>
            <p className="mt-1 font-mono text-sm text-slate-600">{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            <InvoiceStatusBadge status={invoice.status} />
            <p className="mt-2 text-xs text-slate-500">Issued {formatDate(invoice.issued_at)}</p>
            <p className="text-xs text-slate-500">Booking {invoice.reference}</p>
          </div>
        </header>

        <div className="grid gap-6 py-6 sm:grid-cols-2">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Billed to</h2>
            <p className="mt-2 font-semibold text-slate-900">{invoice.customer_name}</p>
            <p className="text-sm text-slate-600">{invoice.customer_email}</p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Facility</h2>
            <p className="mt-2 font-semibold text-slate-900">{invoice.facility_title}</p>
            <p className="text-sm text-slate-600">{invoice.category_name}</p>
            <p className="mt-1 text-sm text-slate-600">
              {formatBookingDate(invoice.starts_at)} · {formatBookingTime(invoice.starts_at)}–
              {formatBookingTime(invoice.ends_at)}
            </p>
          </section>
        </div>

        <table className="w-full border-t border-slate-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-3 font-semibold">Description</th>
              <th className="py-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-3 text-slate-700">
                Facility booking — {formatBookingDate(invoice.starts_at)}
              </td>
              <td className="py-3 text-right text-slate-800">{formatPrice(subtotal)}</td>
            </tr>
            {discount > 0 && (
              <tr>
                <td className="py-3 text-emerald-700">Membership discount</td>
                <td className="py-3 text-right text-emerald-700">−{formatPrice(discount)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200">
              <td className="py-3 text-right font-semibold text-slate-900">Total</td>
              <td className="py-3 text-right text-xl font-bold text-slate-900">
                {formatPrice(invoice.total)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm print:bg-transparent print:p-0">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-slate-500">Payment method</dt>
              <dd className="font-medium text-slate-800">
                {METHOD_LABELS[invoice.payment_method] || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-slate-500">Payment status</dt>
              <dd className="font-medium text-slate-800">
                {invoice.payment_status
                  ? invoice.payment_status.charAt(0).toUpperCase() + invoice.payment_status.slice(1)
                  : '—'}
              </dd>
            </div>
            {invoice.payment_reference && (
              <div className="flex justify-between gap-3 sm:col-span-2 sm:block">
                <dt className="text-slate-500">Transaction reference</dt>
                <dd className="font-mono text-xs text-slate-700">{invoice.payment_reference}</dd>
              </div>
            )}
          </dl>
        </div>

        {invoice.status === 'issued' && (
          <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This invoice is still outstanding — pay at the front desk when you arrive.
          </p>
        )}

        {invoice.status === 'void' && (
          <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            This invoice was voided because its payment was refunded or the booking was cancelled.
          </p>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          Thank you for playing at Sport Center. This invoice was generated automatically.
        </p>
      </article>
    </div>
  )
}
