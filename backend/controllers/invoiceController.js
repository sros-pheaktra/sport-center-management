
const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')

const STAFF_ROLES = ['admin', 'manager', 'staff']

const INVOICE_SELECT = `
    SELECT
        i.id,
        i.invoice_number,
        i.reservation_id,
        i.payment_id,
        i.subtotal,
        i.discount_amount,
        i.promotion_discount,
        i.total,
        i.status,
        i.issued_at,
        i.updated_at,
        r.reference,
        r.user_id,
        r.starts_at,
        r.ends_at,
        r.status AS reservation_status,
        r.facility_id,
        r.promotion_id,
        r.promotion_discount AS reservation_promotion_discount,
        pr.code AS promotion_code,
        pr.title AS promotion_title,
        f.title AS facility_title,
        c.name AS category_name,
        u.full_name AS customer_name,
        u.email AS customer_email,
        pay.method AS payment_method,
        pay.status AS payment_status,
        pay.transaction_ref AS payment_reference,
        pay.paid_at AS payment_paid_at
    FROM invoices i
    JOIN reservations r ON i.reservation_id = r.id
    JOIN facilities f ON r.facility_id = f.id
    JOIN categories c ON f.category_id = c.id
    JOIN users u ON r.user_id = u.id
    LEFT JOIN payments pay ON i.payment_id = pay.id
    LEFT JOIN promotions pr ON r.promotion_id = pr.id
`

const isStaff = (user) => STAFF_ROLES.includes(user.role)

// GET /api/invoices?status=&reservation_id=   (staff+ all, customers own)
exports.listInvoices = asyncHandler(async (req, res) => {
    const status = (req.query.status || '').trim()
    const reservationId = req.query.reservation_id

    const conditions = []
    const params = []

    if (status) {
        if (!['issued', 'paid', 'void'].includes(status)) {
            return res.status(400).json({ message: 'Invalid invoice status filter' })
        }
        conditions.push('i.status = ?')
        params.push(status)
    }

    if (reservationId !== undefined && reservationId !== '') {
        const parsed = Number.parseInt(reservationId, 10)
        if (!Number.isInteger(parsed) || parsed < 1) {
            return res.status(400).json({ message: 'Invalid reservation filter' })
        }
        conditions.push('i.reservation_id = ?')
        params.push(parsed)
    }

    // Customers only ever see their own invoices.
    if (!isStaff(req.user)) {
        conditions.push('r.user_id = ?')
        params.push(req.user.id)
    }

    const whereSql = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : ''

    const [invoices] = await db.query(
        `${INVOICE_SELECT}
         ${whereSql}
         ORDER BY i.issued_at DESC, i.id DESC
         LIMIT 500`,
        params
    )

    res.json({ invoices })
})

// GET /api/invoices/:id   (staff+ or owner)
exports.getInvoice = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid invoice id' })
    }

    const [rows] = await db.query(
        `${INVOICE_SELECT} WHERE i.id = ?`,
        [id]
    )

    if (rows.length === 0) {
        return res.status(404).json({ message: 'Invoice not found' })
    }

    const invoice = rows[0]

    if (!isStaff(req.user) && invoice.user_id !== req.user.id) {
        return res.status(403).json({
            message: 'You do not have permission to view this invoice'
        })
    }

    res.json({ invoice })
})
