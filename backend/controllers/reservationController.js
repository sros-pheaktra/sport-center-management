
const crypto = require('crypto')

const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')
const { expireMemberships, getActiveMembership } = require('../utils/membership')
const { createNotification } = require('../utils/notification')
const {
    normalizeCode,
    findPromotionByCode,
    evaluatePromotion,
    releasePromotion
} = require('../utils/promotion')
const {
    createInvoice,
    setInvoiceStatus,
    markInvoicePaidByPayment
} = require('../utils/invoice')

// Statuses that keep the booked slot reserved. `cancelled` frees
// it again, so it is deliberately not in this list.
const HOLDING_STATUSES = [
    'pending',
    'confirmed',
    'checked_in',
    'completed',
    'no_show'
]

const ALLOWED_STATUSES = [
    'pending',
    'confirmed',
    'cancelled',
    'checked_in',
    'completed',
    'no_show'
]

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const STAFF_ROLES = ['admin', 'manager', 'staff']

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const randomCode = (length) => {
    const bytes = crypto.randomBytes(length)
    return Array.from(bytes)
        .map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length])
        .join('')
}

// The same SELECT is used for lists, details and action responses.
const RESERVATION_SELECT = `
    SELECT
        r.id,
        r.reference,
        r.user_id,
        u.full_name AS customer_name,
        u.email AS customer_email,
        r.facility_id,
        f.title AS facility_title,
        f.image AS facility_image,
        f.price_per_hour,
        f.open_time,
        f.close_time,
        c.name AS category_name,
        r.starts_at,
        r.ends_at,
        r.status,
        r.subtotal,
        r.discount_amount,
        r.promotion_id,
        r.promotion_discount,
        pr.code AS promotion_code,
        pr.title AS promotion_title,
        r.total_price,
        r.notes,
        r.cancellation_reason,
        r.checkin_code,
        r.created_at,
        r.updated_at,
        p.id AS payment_id,
        p.amount AS payment_amount,
        p.method AS payment_method,
        p.status AS payment_status,
        p.transaction_ref AS payment_reference,
        p.paid_at AS payment_paid_at,
        i.id AS invoice_id,
        i.invoice_number,
        i.status AS invoice_status
    FROM reservations r
    JOIN users u ON r.user_id = u.id
    JOIN facilities f ON r.facility_id = f.id
    JOIN categories c ON f.category_id = c.id
    LEFT JOIN payments p ON p.reservation_id = r.id
    LEFT JOIN invoices i ON i.reservation_id = r.id
    LEFT JOIN promotions pr ON r.promotion_id = pr.id
`

// Parses "YYYY-MM-DD" into its numeric parts, rejecting impossible
// dates such as 2026-02-31.
const parseDate = (value) => {
    if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return null

    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(year, month - 1, day)

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null
    }

    return { year, month, day, value }
}

const formatDateTime = (date, time) => `${date} ${time}:00`

const isStaff = (user) => STAFF_ROLES.includes(user.role)

// Marks old pending/confirmed bookings as no-shows lazily (there is no
// background scheduler).
const markExpiredNoShows = async () => {
    await db.query(
        `UPDATE reservations
         SET status = 'no_show'
         WHERE status IN ('pending', 'confirmed')
           AND ends_at < NOW()`
    )
}

const selectById = async (id) => {
    const [rows] = await db.query(
        `${RESERVATION_SELECT} WHERE r.id = ?`,
        [id]
    )
    return rows[0] || null
}

const selectByReference = async (reference) => {
    const [rows] = await db.query(
        `${RESERVATION_SELECT} WHERE r.reference = ?`,
        [reference]
    )
    return rows[0] || null
}

// Picks a booking reference and check-in code that are not taken yet.
const generateUniqueCodes = async (conn) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const reference = `BK-${randomCode(6)}`
        const checkinCode = `CHK-${randomCode(6)}`

        const [rows] = await conn.query(
            `SELECT id FROM reservations
             WHERE reference = ? OR checkin_code = ?`,
            [reference, checkinCode]
        )

        if (rows.length === 0) {
            return { reference, checkinCode }
        }
    }

    throw new Error('Could not generate a unique booking reference')
}

// GET /api/reservations?status=&date=&from=&to=&facility_id=&mine=
// Customers always see their own bookings; staff-side roles see all
// bookings unless `mine=1` is passed.
exports.listReservations = asyncHandler(async (req, res) => {
    await markExpiredNoShows()

    const status = (req.query.status || '').trim()
    const date = (req.query.date || '').trim()
    const from = (req.query.from || '').trim()
    const to = (req.query.to || '').trim()
    const facilityId = req.query.facility_id
    const mine = req.query.mine === '1' || req.query.mine === 'true'

    const conditions = []
    const params = []

    if (status) {
        if (!ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({
                message: 'Invalid status filter'
            })
        }

        conditions.push('r.status = ?')
        params.push(status)
    }

    if (date) {
        if (!parseDate(date)) {
            return res.status(400).json({
                message: 'Invalid date filter'
            })
        }

        conditions.push('r.starts_at >= ? AND r.starts_at < DATE_ADD(?, INTERVAL 1 DAY)')
        params.push(formatDateTime(date, '00:00'), formatDateTime(date, '00:00'))
    } else {
        if (from) {
            if (!parseDate(from)) {
                return res.status(400).json({
                    message: 'Invalid from date'
                })
            }

            conditions.push('r.starts_at >= ?')
            params.push(formatDateTime(from, '00:00'))
        }

        if (to) {
            if (!parseDate(to)) {
                return res.status(400).json({
                    message: 'Invalid to date'
                })
            }

            conditions.push('r.starts_at < ?')
            params.push(formatDateTime(to, '00:00'))
        }
    }

    if (facilityId !== undefined && facilityId !== '') {
        const parsed = Number.parseInt(facilityId, 10)

        if (!Number.isInteger(parsed) || parsed < 1) {
            return res.status(400).json({
                message: 'Invalid facility filter'
            })
        }

        conditions.push('r.facility_id = ?')
        params.push(parsed)
    }

    // Customers can only ever see their own reservations
    if (!isStaff(req.user) || mine) {
        conditions.push('r.user_id = ?')
        params.push(req.user.id)
    }

    const whereSql = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : ''

    const [reservations] = await db.query(
        `${RESERVATION_SELECT}
         ${whereSql}
         ORDER BY r.starts_at DESC, r.id DESC
         LIMIT 500`,
        params
    )

    res.json({ reservations })
})

// GET /api/reservations/:reference   (owner or staff+)
exports.getReservation = asyncHandler(async (req, res) => {
    await markExpiredNoShows()

    const reservation = await selectByReference(req.params.reference)

    if (!reservation) {
        return res.status(404).json({
            message: 'Booking not found. Check the reference and try again.'
        })
    }

    if (!isStaff(req.user) && reservation.user_id !== req.user.id) {
        return res.status(403).json({
            message: 'You do not have permission to view this booking'
        })
    }

    res.json({ reservation })
})

// POST /api/reservations   (any logged-in user books for themselves)
exports.createReservation = asyncHandler(async (req, res) => {
    const {
        facility_id,
        date,
        start_time,
        hours,
        notes,
        payment_method,
        promotion_code
    } = req.body

    const facilityId = Number.parseInt(facility_id, 10)

    if (!Number.isInteger(facilityId) || facilityId < 1) {
        return res.status(400).json({
            message: 'Please choose a valid facility'
        })
    }

    const parsedDate = parseDate(date)

    if (!parsedDate) {
        return res.status(400).json({
            message: 'Please choose a valid booking date'
        })
    }

    if (typeof start_time !== 'string' || !TIME_PATTERN.test(start_time)) {
        return res.status(400).json({
            message: 'Please choose a valid start time'
        })
    }

    const hoursNumber = Number.parseInt(hours, 10)

    if (!Number.isInteger(hoursNumber) || hoursNumber < 1 || hoursNumber > 12) {
        return res.status(400).json({
            message: 'Please choose between 1 and 12 hours'
        })
    }

    const method = payment_method === 'online' ? 'online' : 'at_center'

    const cleanNotes = typeof notes === 'string' ? notes.trim() : ''
    if (cleanNotes.length > 500) {
        return res.status(400).json({
            message: 'Notes must be 500 characters or fewer'
        })
    }

    const startsAt = formatDateTime(parsedDate.value, start_time)
    const startHour = Number.parseInt(start_time.slice(0, 2), 10)
    const startMinute = Number.parseInt(start_time.slice(3, 5), 10)
    const startDate = new Date(
        parsedDate.year,
        parsedDate.month - 1,
        parsedDate.day,
        startHour,
        startMinute
    )

    if (startDate.getTime() <= Date.now()) {
        return res.status(400).json({
            message: 'Bookings must start in the future'
        })
    }

    const endDate = new Date(startDate.getTime() + hoursNumber * 60 * 60 * 1000)

    if (
        endDate.getFullYear() !== parsedDate.year ||
        endDate.getMonth() !== parsedDate.month - 1 ||
        endDate.getDate() !== parsedDate.day
    ) {
        return res.status(400).json({
            message: 'A booking cannot run past midnight'
        })
    }

    const pad = (value) => String(value).padStart(2, '0')
    const endsAt = formatDateTime(
        parsedDate.value,
        `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`
    )

    // Membership discounts are only valid while active.
    await expireMemberships(db)

    const connection = await db.getConnection()

    try {
        await connection.beginTransaction()

        // Lock the facility row so two customers cannot grab the same
        // slot at the same moment.
        const [facilityRows] = await connection.query(
            `SELECT id, title, status, price_per_hour, open_time, close_time
             FROM facilities WHERE id = ? FOR UPDATE`,
            [facilityId]
        )

        if (facilityRows.length === 0) {
            await connection.rollback()
            return res.status(404).json({
                message: 'Facility not found. It may have been deleted.'
            })
        }

        const facility = facilityRows[0]

        if (facility.status !== 'available') {
            await connection.rollback()
            return res.status(409).json({
                message: 'This facility is not available for booking right now'
            })
        }

        const startTimeValue = start_time
        const endTimeValue = `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`

        if (
            startTimeValue < String(facility.open_time).slice(0, 5) ||
            endTimeValue > String(facility.close_time).slice(0, 5)
        ) {
            await connection.rollback()
            return res.status(400).json({
                message: 'The booking must fit inside the facility opening hours'
            })
        }

        const placeholders = HOLDING_STATUSES.map(() => '?').join(', ')

        const [overlaps] = await connection.query(
            `SELECT id FROM reservations
             WHERE facility_id = ?
               AND status IN (${placeholders})
               AND starts_at < ?
               AND ends_at > ?
             FOR UPDATE`,
            [facilityId, ...HOLDING_STATUSES, endsAt, startsAt]
        )

        if (overlaps.length > 0) {
            await connection.rollback()
            return res.status(409).json({
                message: 'That time slot has just been booked. Please choose another.'
            })
        }

        const { reference, checkinCode } = await generateUniqueCodes(connection)

        // Active members get their plan's discount on new bookings.
        const membership = await getActiveMembership(connection, req.user.id)
        const discountPercent = membership
            ? Number(membership.booking_discount_percent)
            : 0

        const pricePerHour = Number(facility.price_per_hour)
        const subtotal = pricePerHour * hoursNumber
        const discountAmount = Math.round(
            subtotal * (discountPercent / 100) * 100
        ) / 100

        // A promotion code applies to the amount left after the
        // membership discount. Lock the row so the usage limit cannot
        // be exceeded by two simultaneous bookings.
        const promoCode = normalizeCode(promotion_code)
        let promotion = null
        let promotionDiscount = 0

        if (promoCode) {
            promotion = await findPromotionByCode(connection, promoCode, {
                forUpdate: true
            })

            const evaluation = evaluatePromotion(promotion, {
                bookingDate: parsedDate.value,
                baseAmount: Math.max(0, subtotal - discountAmount)
            })

            if (evaluation.error) {
                await connection.rollback()
                return res.status(400).json({ message: evaluation.error })
            }

            promotion = evaluation.promotion
            promotionDiscount = evaluation.discount
        }

        const totalPrice = Math.max(
            0,
            subtotal - discountAmount - promotionDiscount
        )
        const reservationStatus = method === 'online' ? 'confirmed' : 'pending'

        const [result] = await connection.query(
            `INSERT INTO reservations
                (reference, user_id, facility_id, starts_at, ends_at, status,
                 subtotal, discount_amount, promotion_id, promotion_discount,
                 total_price, notes, checkin_code)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                reference,
                req.user.id,
                facilityId,
                startsAt,
                endsAt,
                reservationStatus,
                subtotal.toFixed(2),
                discountAmount.toFixed(2),
                promotion ? promotion.id : null,
                promotionDiscount.toFixed(2),
                totalPrice.toFixed(2),
                cleanNotes || null,
                checkinCode
            ]
        )

        if (promotion) {
            await connection.query(
                `UPDATE promotions SET used_count = used_count + 1
                 WHERE id = ?`,
                [promotion.id]
            )
        }

        const paymentStatus = method === 'online' ? 'paid' : 'pending'
        const paidAt = method === 'online' ? new Date() : null
        const transactionRef = method === 'online'
            ? `SIM-ONLINE-${randomCode(8)}`
            : null

        const [paymentResult] = await connection.query(
            `INSERT INTO payments
                (reservation_id, amount, method, status, transaction_ref, paid_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                result.insertId,
                totalPrice.toFixed(2),
                method,
                paymentStatus,
                transactionRef,
                paidAt
            ]
        )

        await createInvoice(connection, {
            reservationId: result.insertId,
            paymentId: paymentResult.insertId,
            subtotal: subtotal.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
            promotionDiscount: promotionDiscount.toFixed(2),
            total: totalPrice.toFixed(2),
            status: method === 'online' ? 'paid' : 'issued'
        })

        await createNotification(connection, {
            userId: req.user.id,
            type: 'reservation',
            title: method === 'online' ? 'Booking confirmed' : 'Booking received',
            message: method === 'online'
                ? `Booking ${reference} at ${facility.title} is confirmed and paid.`
                : `Booking ${reference} at ${facility.title} is reserved. Please pay at the front desk.`,
            link: `/bookings/${reference}`
        })

        await connection.commit()

        const reservation = await selectById(result.insertId)

        res.status(201).json({
            message: method === 'online'
                ? 'Booking confirmed and paid successfully'
                : 'Booking created. Pay at the center when you arrive.',
            reservation,
            membership: membership
                ? {
                    plan_name: membership.plan_name,
                    booking_discount_percent: discountPercent
                }
                : null,
            promotion: promotion
                ? {
                    code: promotion.code,
                    title: promotion.title,
                    discount: promotionDiscount.toFixed(2)
                }
                : null
        })
    } catch (error) {
        await connection.rollback()
        throw error
    } finally {
        connection.release()
    }
})

// Finds the reservation for an action and checks the caller may act on it.
const loadActionable = async (req, res, { ownerOnly = false } = {}) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        res.status(400).json({ message: 'Invalid booking id' })
        return null
    }

    const [rows] = await db.query(
        `SELECT r.*, p.id AS payment_id, p.status AS payment_status,
                p.method AS payment_method
         FROM reservations r
         LEFT JOIN payments p ON p.reservation_id = r.id
         WHERE r.id = ?`,
        [id]
    )

    if (rows.length === 0) {
        res.status(404).json({ message: 'Booking not found' })
        return null
    }

    const reservation = rows[0]

    if (ownerOnly) {
        if (reservation.user_id !== req.user.id) {
            res.status(403).json({
                message: 'You do not have permission to change this booking'
            })
            return null
        }
    } else if (!isStaff(req.user) && reservation.user_id !== req.user.id) {
        res.status(403).json({
            message: 'You do not have permission to change this booking'
        })
        return null
    }

    return reservation
}

// POST /api/reservations/:id/cancel   (owner before start, staff+ any time)
exports.cancelReservation = asyncHandler(async (req, res) => {
    const reservation = await loadActionable(req, res)

    if (!reservation) return

    if (!['pending', 'confirmed'].includes(reservation.status)) {
        return res.status(400).json({
            message: 'Only pending or confirmed bookings can be cancelled'
        })
    }

    // Customers cannot cancel once the session has started
    if (!isStaff(req.user) && new Date(reservation.starts_at).getTime() <= Date.now()) {
        return res.status(400).json({
            message: 'Bookings can only be cancelled before their start time'
        })
    }

    const reason = typeof req.body?.reason === 'string'
        ? req.body.reason.trim().slice(0, 500)
        : ''

    await db.query(
        `UPDATE reservations
         SET status = 'cancelled', cancellation_reason = ?
         WHERE id = ?`,
        [reason || null, reservation.id]
    )

    // Free the promotion slot so the code can be used again.
    await releasePromotion(db, reservation.promotion_id)

    if (reservation.payment_id) {
        if (reservation.payment_status === 'paid') {
            await db.query(
                `UPDATE payments SET status = 'refunded' WHERE reservation_id = ?`,
                [reservation.id]
            )
        } else if (reservation.payment_status === 'pending') {
            await db.query(
                `UPDATE payments SET status = 'failed' WHERE reservation_id = ?`,
                [reservation.id]
            )
        }
    }

    const updated = await selectById(reservation.id)

    // Cancelling voids the invoice as well.
    await setInvoiceStatus(db, reservation.id, 'void')

    await createNotification(db, {
        userId: reservation.user_id,
        type: 'reservation',
        title: 'Booking cancelled',
        message: `Booking ${reservation.reference} was cancelled${reason ? `: ${reason}` : '.'}`,
        link: `/bookings/${reservation.reference}`
    })

    res.json({
        message: reservation.payment_status === 'paid'
            ? 'Booking cancelled and payment refunded'
            : 'Booking cancelled',
        reservation: updated
    })
})

// POST /api/reservations/:id/confirm   (staff+)
exports.confirmReservation = asyncHandler(async (req, res) => {
    const reservation = await loadActionable(req, res)

    if (!reservation) return

    if (reservation.status !== 'pending') {
        return res.status(400).json({
            message: 'Only pending bookings can be confirmed'
        })
    }

    await db.query(
        `UPDATE reservations SET status = 'confirmed' WHERE id = ?`,
        [reservation.id]
    )

    await createNotification(db, {
        userId: reservation.user_id,
        type: 'reservation',
        title: 'Booking confirmed',
        message: `Booking ${reservation.reference} has been confirmed by the front desk.`,
        link: `/bookings/${reservation.reference}`
    })

    res.json({
        message: 'Booking confirmed',
        reservation: await selectById(reservation.id)
    })
})

// Applies the shared check-in transition: status, at-center payment
// settlement and a notification for the customer.
const performCheckIn = async (reservation, staffUserId) => {
    await db.query(
        `UPDATE reservations SET status = 'checked_in' WHERE id = ?`,
        [reservation.id]
    )

    if (
        reservation.payment_id &&
        reservation.payment_status === 'pending' &&
        reservation.payment_method === 'at_center'
    ) {
        await db.query(
            `UPDATE payments
             SET status = 'paid', paid_at = NOW(), recorded_by = ?
             WHERE reservation_id = ?`,
            [staffUserId, reservation.id]
        )

        await markInvoicePaidByPayment(db, reservation.payment_id)
    }

    await createNotification(db, {
        userId: reservation.user_id,
        type: 'reservation',
        title: 'Checked in',
        message: `You are checked in for booking ${reservation.reference}. Enjoy your session!`,
        link: `/bookings/${reservation.reference}`
    })

    return selectById(reservation.id)
}

// POST /api/reservations/:id/check-in   (staff+)
// An outstanding at-center payment is recorded here, which matches
// the front-desk flow: verify the booking, take payment, check in.
exports.checkInReservation = asyncHandler(async (req, res) => {
    const reservation = await loadActionable(req, res)

    if (!reservation) return

    if (!['pending', 'confirmed'].includes(reservation.status)) {
        return res.status(400).json({
            message: 'Only pending or confirmed bookings can be checked in'
        })
    }

    res.json({
        message: 'Customer checked in',
        reservation: await performCheckIn(reservation, req.user.id)
    })
})

// POST /api/reservations/check-in/:code   (staff+)
// QR/code check-in from the front desk: the code printed on the
// customer's confirmation resolves the booking.
exports.checkInByCode = asyncHandler(async (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase()

    if (!code) {
        return res.status(400).json({ message: 'Please enter a check-in code' })
    }

    const [rows] = await db.query(
        `SELECT r.*, p.id AS payment_id, p.status AS payment_status,
                p.method AS payment_method
         FROM reservations r
         LEFT JOIN payments p ON p.reservation_id = r.id
         WHERE r.checkin_code = ?`,
        [code]
    )

    if (rows.length === 0) {
        return res.status(404).json({
            message: 'No booking matches that check-in code'
        })
    }

    const reservation = rows[0]

    if (!['pending', 'confirmed'].includes(reservation.status)) {
        return res.status(400).json({
            message: `This booking is already ${String(reservation.status).replace('_', ' ')}`
        })
    }

    res.json({
        message: 'Customer checked in',
        reservation: await performCheckIn(reservation, req.user.id)
    })
})

// POST /api/reservations/:id/complete   (staff+)
exports.completeReservation = asyncHandler(async (req, res) => {
    const reservation = await loadActionable(req, res)

    if (!reservation) return

    if (reservation.status !== 'checked_in') {
        return res.status(400).json({
            message: 'Only checked-in bookings can be completed'
        })
    }

    await db.query(
        `UPDATE reservations SET status = 'completed' WHERE id = ?`,
        [reservation.id]
    )

    await createNotification(db, {
        userId: reservation.user_id,
        type: 'reservation',
        title: 'Booking completed',
        message: `Thanks for playing! You can now review facility #${reservation.facility_id}.`,
        link: `/facilities/${reservation.facility_id}`
    })

    res.json({
        message: 'Booking completed',
        reservation: await selectById(reservation.id)
    })
})

// POST /api/reservations/:id/no-show   (staff+)
exports.markNoShow = asyncHandler(async (req, res) => {
    const reservation = await loadActionable(req, res)

    if (!reservation) return

    if (!['pending', 'confirmed'].includes(reservation.status)) {
        return res.status(400).json({
            message: 'Only pending or confirmed bookings can be marked as no-show'
        })
    }

    if (new Date(reservation.starts_at).getTime() > Date.now()) {
        return res.status(400).json({
            message: 'A booking can only be marked no-show after its start time'
        })
    }

    await db.query(
        `UPDATE reservations SET status = 'no_show' WHERE id = ?`,
        [reservation.id]
    )

    await createNotification(db, {
        userId: reservation.user_id,
        type: 'reservation',
        title: 'Booking marked no-show',
        message: `Booking ${reservation.reference} was marked as a no-show because it was not checked in.`,
        link: `/bookings/${reservation.reference}`
    })

    res.json({
        message: 'Booking marked as no-show',
        reservation: await selectById(reservation.id)
    })
})

// POST /api/reservations/:id/pay   (owner)
// Simulated online payment: marks the pending payment paid and
// confirms the booking.
exports.payReservation = asyncHandler(async (req, res) => {
    const reservation = await loadActionable(req, res, { ownerOnly: true })

    if (!reservation) return

    if (['cancelled', 'completed', 'no_show'].includes(reservation.status)) {
        return res.status(400).json({
            message: 'This booking can no longer be paid'
        })
    }

    if (!reservation.payment_id) {
        return res.status(400).json({
            message: 'This booking has no payment to complete'
        })
    }

    if (reservation.payment_status !== 'pending') {
        return res.status(400).json({
            message: 'This booking is already paid'
        })
    }

    const transactionRef = `SIM-ONLINE-${randomCode(8)}`

    await db.query(
        `UPDATE payments
         SET status = 'paid', method = 'online',
             transaction_ref = ?, paid_at = NOW()
         WHERE reservation_id = ?`,
        [transactionRef, reservation.id]
    )

    await db.query(
        `UPDATE reservations
         SET status = 'confirmed'
         WHERE id = ? AND status = 'pending'`,
        [reservation.id]
    )

    await markInvoicePaidByPayment(db, reservation.payment_id)

    await createNotification(db, {
        userId: reservation.user_id,
        type: 'payment',
        title: 'Payment received',
        message: `We received $${Number(reservation.total_price).toFixed(2)} for booking ${reservation.reference}.`,
        link: `/bookings/${reservation.reference}`
    })

    res.json({
        message: 'Payment successful — your booking is confirmed',
        reservation: await selectById(reservation.id)
    })
})
