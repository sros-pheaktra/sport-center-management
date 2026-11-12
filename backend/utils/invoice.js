
const crypto = require('crypto')

// Invoices are numbered INV-YYYYMM-000123 where the last part is
// the zero-padded invoice id. The id is only known after insert,
// so a unique temporary number is written first and replaced in
// the same transaction.
const pad = (value) => String(value).padStart(2, '0')

const monthStamp = () => {
    const now = new Date()
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}`
}

// Creates the invoice row for a reservation. `conn` must be an
// open transaction connection so the invoice and booking commit
// together.
const createInvoice = async (conn, {
    reservationId,
    paymentId,
    subtotal,
    discountAmount,
    promotionDiscount = 0,
    total,
    status
}) => {
    const temporaryNumber = `TMP-${crypto.randomBytes(8).toString('hex')}`

    const [result] = await conn.query(
        `INSERT INTO invoices
            (invoice_number, reservation_id, payment_id,
             subtotal, discount_amount, promotion_discount, total, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            temporaryNumber,
            reservationId,
            paymentId,
            subtotal,
            discountAmount,
            promotionDiscount,
            total,
            status
        ]
    )

    const invoiceNumber =
        `INV-${monthStamp()}-${String(result.insertId).padStart(6, '0')}`

    await conn.query(
        'UPDATE invoices SET invoice_number = ? WHERE id = ?',
        [invoiceNumber, result.insertId]
    )

    return { id: result.insertId, invoiceNumber }
}

// Keeps the booking's invoice in step with its payment.
const setInvoiceStatus = async (conn, reservationId, status) => {
    await conn.query(
        'UPDATE invoices SET status = ? WHERE reservation_id = ?',
        [status, reservationId]
    )
}

// Marks the invoice paid when its payment is recorded.
const markInvoicePaidByPayment = async (conn, paymentId) => {
    await conn.query(
        `UPDATE invoices SET status = 'paid'
         WHERE payment_id = ? AND status = 'issued'`,
        [paymentId]
    )
}

module.exports = {
    createInvoice,
    setInvoiceStatus,
    markInvoicePaidByPayment
}
