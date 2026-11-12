
const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')
const { createNotification } = require('../utils/notification')

const REVIEW_SELECT = `
    SELECT
        rv.id,
        rv.facility_id,
        f.title AS facility_title,
        rv.user_id,
        u.full_name AS customer_name,
        rv.reservation_id,
        res.reference,
        rv.rating,
        rv.comment,
        rv.created_at,
        rv.updated_at
    FROM reviews rv
    JOIN facilities f ON rv.facility_id = f.id
    JOIN users u ON rv.user_id = u.id
    LEFT JOIN reservations res ON rv.reservation_id = res.id
`

const selectReviewById = async (id) => {
    const [rows] = await db.query(
        `${REVIEW_SELECT} WHERE rv.id = ?`,
        [id]
    )
    return rows[0] || null
}

const validateReview = (body) => {
    const rating = Number.parseInt(body.rating, 10)
    const comment = typeof body.comment === 'string'
        ? body.comment.trim()
        : ''

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return { error: 'Please choose a rating from 1 to 5 stars' }
    }

    if (comment.length > 1000) {
        return { error: 'Your review must be 1000 characters or fewer' }
    }

    return { values: { rating, comment: comment || null } }
}

// GET /api/facilities/:id/reviews   (public)
// Returns the reviews, an average/distribution summary and — when a
// customer is logged in — their review and whether they can write one.
exports.listFacilityReviews = asyncHandler(async (req, res) => {
    const facilityId = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(facilityId) || facilityId < 1) {
        return res.status(400).json({ message: 'Invalid facility id' })
    }

    const [facilityRows] = await db.query(
        'SELECT id, title FROM facilities WHERE id = ?',
        [facilityId]
    )

    if (facilityRows.length === 0) {
        return res.status(404).json({ message: 'Facility not found' })
    }

    const [[summaryRows], [distributionRows], [reviews]] = await Promise.all([
        db.query(
            `SELECT COUNT(*) AS count,
                    COALESCE(ROUND(AVG(rating), 1), 0) AS average
             FROM reviews WHERE facility_id = ?`,
            [facilityId]
        ),
        db.query(
            `SELECT rating, COUNT(*) AS count
             FROM reviews WHERE facility_id = ?
             GROUP BY rating ORDER BY rating DESC`,
            [facilityId]
        ),
        db.query(
            `${REVIEW_SELECT}
             WHERE rv.facility_id = ?
             ORDER BY rv.created_at DESC, rv.id DESC
             LIMIT 100`,
            [facilityId]
        )
    ])

    const distribution = Object.fromEntries(
        distributionRows.map((row) => [row.rating, Number(row.count)])
    )

    let myReview = null
    let canReview = false

    if (req.session?.userId) {
        const [userRows] = await db.query(
            `SELECT id, role FROM users
             WHERE id = ? AND is_active = TRUE`,
            [req.session.userId]
        )

        const viewer = userRows[0]

        if (viewer) {
            const [mine] = await db.query(
                `${REVIEW_SELECT}
                 WHERE rv.facility_id = ? AND rv.user_id = ?`,
                [facilityId, viewer.id]
            )

            myReview = mine[0] || null

            if (viewer.role === 'customer' && !myReview) {
                const [completed] = await db.query(
                    `SELECT id FROM reservations
                     WHERE user_id = ? AND facility_id = ?
                       AND status = 'completed'
                     LIMIT 1`,
                    [viewer.id, facilityId]
                )

                canReview = completed.length > 0
            }
        }
    }

    res.json({
        facility: facilityRows[0],
        summary: {
            count: Number(summaryRows[0].count),
            average: Number(summaryRows[0].average),
            distribution
        },
        reviews,
        my_review: myReview,
        can_review: canReview
    })
})

// POST /api/facilities/:id/reviews   (customer)
// Customers may review a facility once they have completed a booking there.
exports.createReview = asyncHandler(async (req, res) => {
    const facilityId = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(facilityId) || facilityId < 1) {
        return res.status(400).json({ message: 'Invalid facility id' })
    }

    const validation = validateReview(req.body)

    if (validation.error) {
        return res.status(400).json({ message: validation.error })
    }

    const [facilityRows] = await db.query(
        'SELECT id, title, user_id FROM facilities WHERE id = ?',
        [facilityId]
    )

    if (facilityRows.length === 0) {
        return res.status(404).json({ message: 'Facility not found' })
    }

    const facility = facilityRows[0]

    const [existing] = await db.query(
        'SELECT id FROM reviews WHERE user_id = ? AND facility_id = ?',
        [req.user.id, facilityId]
    )

    if (existing.length > 0) {
        return res.status(409).json({
            message: 'You have already reviewed this facility'
        })
    }

    // Use the supplied completed booking when valid, otherwise the
    // customer's most recent completed booking at this facility.
    let reservationId = null

    if (
        req.body?.reservation_id !== undefined &&
        req.body.reservation_id !== null &&
        req.body.reservation_id !== ''
    ) {
        const requested = Number.parseInt(req.body.reservation_id, 10)

        if (!Number.isInteger(requested) || requested < 1) {
            return res.status(400).json({ message: 'Invalid booking id' })
        }

        const [rows] = await db.query(
            `SELECT id FROM reservations
             WHERE id = ? AND user_id = ? AND facility_id = ?
               AND status = 'completed'`,
            [requested, req.user.id, facilityId]
        )

        if (rows.length === 0) {
            return res.status(403).json({
                message: 'You can only review a facility after a completed booking there'
            })
        }

        reservationId = rows[0].id
    } else {
        const [rows] = await db.query(
            `SELECT id FROM reservations
             WHERE user_id = ? AND facility_id = ? AND status = 'completed'
             ORDER BY starts_at DESC LIMIT 1`,
            [req.user.id, facilityId]
        )

        if (rows.length === 0) {
            return res.status(403).json({
                message: 'You can only review a facility after a completed booking there'
            })
        }

        reservationId = rows[0].id
    }

    const [result] = await db.query(
        `INSERT INTO reviews
            (facility_id, user_id, reservation_id, rating, comment)
         VALUES (?, ?, ?, ?, ?)`,
        [
            facilityId,
            req.user.id,
            reservationId,
            validation.values.rating,
            validation.values.comment
        ]
    )

    // Let the facility owner know there is a new review to look at.
    if (facility.user_id && facility.user_id !== req.user.id) {
        await createNotification(db, {
            userId: facility.user_id,
            type: 'system',
            title: 'New facility review',
            message: `${req.user.full_name} left a ${validation.values.rating}-star review for ${facility.title}.`,
            link: `/facilities/${facilityId}`
        })
    }

    res.status(201).json({
        message: 'Thanks for your review!',
        review: await selectReviewById(result.insertId)
    })
})

// GET /api/reviews?facility_id=&rating=   (staff-side moderation list)
exports.listReviews = asyncHandler(async (req, res) => {
    const facilityId = req.query.facility_id
    const rating = req.query.rating

    const conditions = []
    const params = []

    if (facilityId !== undefined && facilityId !== '') {
        const parsed = Number.parseInt(facilityId, 10)

        if (!Number.isInteger(parsed) || parsed < 1) {
            return res.status(400).json({ message: 'Invalid facility filter' })
        }

        conditions.push('rv.facility_id = ?')
        params.push(parsed)
    }

    if (rating !== undefined && rating !== '') {
        const parsed = Number.parseInt(rating, 10)

        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
            return res.status(400).json({ message: 'Invalid rating filter' })
        }

        conditions.push('rv.rating = ?')
        params.push(parsed)
    }

    const whereSql = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : ''

    const [reviews] = await db.query(
        `${REVIEW_SELECT}
         ${whereSql}
         ORDER BY rv.created_at DESC, rv.id DESC
         LIMIT 500`,
        params
    )

    res.json({ reviews })
})

// DELETE /api/reviews/:id   (admin/manager)
exports.deleteReview = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid review id' })
    }

    const [result] = await db.query(
        'DELETE FROM reviews WHERE id = ?',
        [id]
    )

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Review not found' })
    }

    res.json({ message: 'Review deleted' })
})
