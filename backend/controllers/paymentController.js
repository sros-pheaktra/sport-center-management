
const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')
const { createNotification } = require('../utils/notification')
const { releasePromotion } = require('../utils/promotion')
const {
    markInvoicePaidByPayment,
    setInvoiceStatus
} = require('../utils/invoice')

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const PAYMENT_SELECT = `
    SELECT
        pay.id,
        pay.reservation_id,
        pay.amount,
        pay.method,
        pay.status,
        pay.transaction_ref,
        pay.paid_at,
        pay.recorded_by,
        pay.created_at,
        rec.full_name AS recorded_by_name,
        r.reference,
        r.user_id,
        u.full_name AS customer_name,
        u.email AS customer_email,
        r.facility_id,
        f.title AS facility_title,
        r.starts_at,
        r.ends_at,
        r.promotion_id,
        r.status AS reservation_status,
        i.id AS invoice_id,
        i.invoice_number,
        i.status AS invoice_status
    FROM payments pay
    JOIN reservations r ON pay.reservation_id = r.id
    JOIN users u ON r.user_id = u.id
    JOIN facilities f ON r.facility_id = f.id
    LEFT JOIN invoices i ON i.reservation_id = r.id
    LEFT JOIN users rec ON rec.id = pay.recorded_by
`

const selectPaymentById = async (id) => {
    const [rows] = await db.query(
        `${PAYMENT_SELECT} WHERE pay.id = ?`,
        [id]
    )
    return rows[0] || null
}

const isRealDate = (value) => {
    if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    )
}

// GET /api/payments?status=&method=&date=&from=&to=   (staff+)
exports.listPayments = asyncHandler(async (req, res) => {
    const status = (req.query.status || '').trim()
    const method = (req.query.method || '').trim()
    const date = (req.query.date || '').trim()
    const from = (req.query.from || '').trim()
    const to = (req.query.to || '').trim()

    const conditions = []
    const params = []

    if (status) {
        if (!['pending', 'paid', 'refunded', 'failed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid payment status filter' })
        }
        conditions.push('pay.status = ?')
        params.push(status)
    }

    if (method) {
        if (!['online', 'at_center'].includes(method)) {
            return res.status(400).json({ message: 'Invalid payment method filter' })
        }
        conditions.push('pay.method = ?')
        params.push(method)
    }

    if (date) {
        if (!isRealDate(date)) {
            return res.status(400).json({ message: 'Invalid payment date filter' })
        }
        conditions.push('DATE(pay.created_at) = ?')
        params.push(date)
    } else {
        if (from) {
            if (!isRealDate(from)) {
                return res.status(400).json({ message: 'Invalid from date' })
            }
            conditions.push('pay.created_at >= ?')
            params.push(`${from} 00:00:00`)
        }

        if (to) {
            if (!isRealDate(to)) {
                return res.status(400).json({ message: 'Invalid to date' })
            }
            conditions.push('pay.created_at < DATE_ADD(?, INTERVAL 1 DAY)')
            params.push(`${to} 00:00:00`)
        }
    }

    const whereSql = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : ''

    const [payments] = await db.query(
        `${PAYMENT_SELECT}
         ${whereSql}
         ORDER BY pay.created_at DESC, pay.id DESC
         LIMIT 500`,
        params
    )

    res.json({ payments })
})

// GET /api/payments/:id   (staff+)
exports.getPayment = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid payment id' })
    }

    const payment = await selectPaymentById(id)

    if (!payment) {
        return res.status(404).json({ message: 'Payment not found' })
    }

    res.json({ payment })
})

// POST /api/payments/:id/record   (staff+)
// Records an outstanding at-center payment and confirms the booking.
exports.recordPayment = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid payment id' })
    }

    const payment = await selectPaymentById(id)

    if (!payment) {
        return res.status(404).json({ message: 'Payment not found' })
    }

    if (payment.status !== 'pending') {
        return res.status(400).json({
            message: 'Only pending payments can be recorded'
        })
    }

    await db.query(
        `UPDATE payments
         SET status = 'paid', paid_at = NOW(), recorded_by = ?
         WHERE id = ? AND status = 'pending'`,
        [req.user.id, id]
    )

    if (payment.reservation_status === 'pending') {
        await db.query(
            `UPDATE reservations SET status = 'confirmed' WHERE id = ?`,
            [payment.reservation_id]
        )
    }

    await markInvoicePaidByPayment(db, id)

    await createNotification(db, {
        userId: payment.user_id,
        type: 'payment',
        title: 'Payment received',
        message: `We received $${Number(payment.amount).toFixed(2)} for booking ${payment.reference}.`,
        link: `/bookings/${payment.reference}`
    })

    res.json({
        message: 'Payment recorded',
        payment: await selectPaymentById(id)
    })
})

// POST /api/payments/:id/refund   (admin/manager)
// Refunds a paid payment, voids its invoice and cancels an active
// booking (completed sessions stay completed).
exports.refundPayment = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid payment id' })
    }

    const payment = await selectPaymentById(id)

    if (!payment) {
        return res.status(404).json({ message: 'Payment not found' })
    }

    if (payment.status !== 'paid') {
        return res.status(400).json({
            message: 'Only paid payments can be refunded'
        })
    }

    await db.query(
        `UPDATE payments SET status = 'refunded' WHERE id = ?`,
        [id]
    )

    await setInvoiceStatus(db, payment.reservation_id, 'void')

    if (['pending', 'confirmed'].includes(payment.reservation_status)) {
        await db.query(
            `UPDATE reservations
             SET status = 'cancelled',
                 cancellation_reason = 'Payment refunded by staff'
             WHERE id = ?`,
            [payment.reservation_id]
        )

        // The cancelled booking no longer consumes the promo code.
        await releasePromotion(db, payment.promotion_id)
    }

    await createNotification(db, {
        userId: payment.user_id,
        type: 'payment',
        title: 'Payment refunded',
        message: `$${Number(payment.amount).toFixed(2)} for booking ${payment.reference} was refunded.`,
        link: `/bookings/${payment.reference}`
    })

    res.json({
        message: 'Payment refunded',
        payment: await selectPaymentById(id)
    })
})
