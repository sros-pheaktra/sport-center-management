
const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')
const {
    expireMemberships,
    getActiveMembership
} = require('../utils/membership')
const {
    normalizeCode,
    isValidDateString,
    findPromotionByCode,
    evaluatePromotion
} = require('../utils/promotion')

const CODE_PATTERN = /^[A-Z0-9_-]{3,30}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const TYPES = ['percent', 'fixed']

const todayValue = () => {
    const now = new Date()
    const pad = (value) => String(value).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const validatePromotion = (body, { currentUsedCount = 0 } = {}) => {
    const code = normalizeCode(body.code)
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string'
        ? body.description.trim()
        : ''
    const discountType = typeof body.discount_type === 'string'
        ? body.discount_type
        : 'percent'
    const discountValue = Number(body.discount_value)
    const validFrom = String(body.valid_from || '').trim()
    const validUntil = String(body.valid_until || '').trim()

    if (!CODE_PATTERN.test(code)) {
        return { error: 'Code must be 3–30 characters using letters, numbers, _ or -' }
    }

    if (title.length < 3 || title.length > 150) {
        return { error: 'Title must be between 3 and 150 characters' }
    }

    if (description.length > 500) {
        return { error: 'Description must be 500 characters or fewer' }
    }

    if (!TYPES.includes(discountType)) {
        return { error: 'Discount type must be percent or fixed' }
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
        return { error: 'Discount value must be greater than zero' }
    }

    if (discountType === 'percent' && discountValue > 100) {
        return { error: 'A percentage discount cannot exceed 100%' }
    }

    if (discountType === 'fixed' && discountValue > 100000) {
        return { error: 'A fixed discount is too large' }
    }

    if (!isValidDateString(validFrom) || !isValidDateString(validUntil)) {
        return { error: 'Please provide valid from and until dates' }
    }

    if (validUntil < validFrom) {
        return { error: 'The end date must be on or after the start date' }
    }

    let usageLimit = null

    if (
        body.usage_limit !== undefined &&
        body.usage_limit !== null &&
        body.usage_limit !== ''
    ) {
        usageLimit = Number.parseInt(body.usage_limit, 10)

        if (!Number.isInteger(usageLimit) || usageLimit < 1 || usageLimit > 1000000) {
            return { error: 'Usage limit must be between 1 and 1,000,000' }
        }

        if (usageLimit < currentUsedCount) {
            return {
                error: `Usage limit cannot be lower than the ${currentUsedCount} times already used`
            }
        }
    }

    return {
        values: {
            code,
            title,
            description: description || null,
            discountType,
            discountValue: discountValue.toFixed(2),
            validFrom,
            validUntil,
            usageLimit,
            isActive: body.is_active === undefined ? true : Boolean(body.is_active)
        }
    }
}

const decoratePromotion = (promotion) => {
    const today = todayValue()
    const from = String(promotion.valid_from).slice(0, 10)
    const until = String(promotion.valid_until).slice(0, 10)
    const exhausted = promotion.usage_limit !== null &&
        Number(promotion.used_count) >= Number(promotion.usage_limit)

    return {
        ...promotion,
        is_expired: today > until,
        is_upcoming: today < from,
        is_exhausted: exhausted,
        is_redeemable: promotion.is_active && !exhausted &&
            today >= from && today <= until
    }
}

const selectPromotionById = async (id) => {
    const [rows] = await db.query(
        `SELECT id, code, title, description, discount_type, discount_value,
                valid_from, valid_until, usage_limit, used_count, is_active,
                created_at
         FROM promotions WHERE id = ?`,
        [id]
    )

    return rows[0] ? decoratePromotion(rows[0]) : null
}

// GET /api/promotions   (admin/manager)
exports.listPromotions = asyncHandler(async (req, res) => {
    const [promotions] = await db.query(
        `SELECT id, code, title, description, discount_type, discount_value,
                valid_from, valid_until, usage_limit, used_count, is_active,
                created_at
         FROM promotions
         ORDER BY is_active DESC, valid_until DESC, id DESC`
    )

    res.json({ promotions: promotions.map(decoratePromotion) })
})

// POST /api/promotions   (admin/manager)
exports.createPromotion = asyncHandler(async (req, res) => {
    const validation = validatePromotion(req.body)

    if (validation.error) {
        return res.status(400).json({ message: validation.error })
    }

    const {
        code, title, description, discountType,
        discountValue, validFrom, validUntil, usageLimit, isActive
    } = validation.values

    const [existing] = await db.query(
        'SELECT id FROM promotions WHERE code = ?',
        [code]
    )

    if (existing.length > 0) {
        return res.status(409).json({
            message: 'A promotion with that code already exists'
        })
    }

    const [result] = await db.query(
        `INSERT INTO promotions
            (code, title, description, discount_type, discount_value,
             valid_from, valid_until, usage_limit, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            code, title, description, discountType, discountValue,
            validFrom, validUntil, usageLimit, isActive
        ]
    )

    res.status(201).json({
        message: 'Promotion created',
        promotion: await selectPromotionById(result.insertId)
    })
})

// PUT /api/promotions/:id   (admin/manager)
exports.updatePromotion = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid promotion id' })
    }

    const [rows] = await db.query(
        'SELECT * FROM promotions WHERE id = ?',
        [id]
    )

    if (rows.length === 0) {
        return res.status(404).json({ message: 'Promotion not found' })
    }

    const current = rows[0]
    const validation = validatePromotion(req.body, {
        currentUsedCount: Number(current.used_count)
    })

    if (validation.error) {
        return res.status(400).json({ message: validation.error })
    }

    const {
        code, title, description, discountType,
        discountValue, validFrom, validUntil, usageLimit, isActive
    } = validation.values

    const [duplicate] = await db.query(
        'SELECT id FROM promotions WHERE code = ? AND id <> ?',
        [code, id]
    )

    if (duplicate.length > 0) {
        return res.status(409).json({
            message: 'A promotion with that code already exists'
        })
    }

    await db.query(
        `UPDATE promotions
         SET code = ?, title = ?, description = ?, discount_type = ?,
             discount_value = ?, valid_from = ?, valid_until = ?,
             usage_limit = ?, is_active = ?
         WHERE id = ?`,
        [
            code, title, description, discountType, discountValue,
            validFrom, validUntil, usageLimit, isActive, id
        ]
    )

    res.json({
        message: 'Promotion updated',
        promotion: await selectPromotionById(id)
    })
})

// DELETE /api/promotions/:id   (admin/manager)
// Codes that bookings already used stay for history; deactivate them.
exports.deletePromotion = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid promotion id' })
    }

    const [rows] = await db.query(
        'SELECT id, used_count FROM promotions WHERE id = ?',
        [id]
    )

    if (rows.length === 0) {
        return res.status(404).json({ message: 'Promotion not found' })
    }

    if (Number(rows[0].used_count) > 0) {
        return res.status(409).json({
            message: 'This promotion has been used and cannot be deleted. Deactivate it instead.'
        })
    }

    await db.query('DELETE FROM promotions WHERE id = ?', [id])

    res.json({ message: 'Promotion deleted' })
})

// POST /api/promotions/validate   (logged in)
// Body: { code, facility_id, date, start_time, hours }
// Recalculates the membership + promotion discounts exactly like
// the booking endpoint, so the browser preview always matches.
exports.validatePromotion = asyncHandler(async (req, res) => {
    const code = normalizeCode(req.body?.code)
    const facilityId = Number.parseInt(req.body?.facility_id, 10)
    const hours = Number.parseInt(req.body?.hours, 10)
    const date = String(req.body?.date || '').trim()
    const startTime = String(req.body?.start_time || '').trim()

    if (!code) {
        return res.status(400).json({ message: 'Please enter a promotion code' })
    }

    if (!Number.isInteger(facilityId) || facilityId < 1) {
        return res.status(400).json({ message: 'Please choose a valid facility' })
    }

    if (!isValidDateString(date)) {
        return res.status(400).json({ message: 'Please choose a valid booking date' })
    }

    if (!TIME_PATTERN.test(startTime)) {
        return res.status(400).json({ message: 'Please choose a valid start time' })
    }

    if (!Number.isInteger(hours) || hours < 1 || hours > 12) {
        return res.status(400).json({ message: 'Please choose between 1 and 12 hours' })
    }

    const [facilityRows] = await db.query(
        `SELECT id, price_per_hour FROM facilities WHERE id = ?`,
        [facilityId]
    )

    if (facilityRows.length === 0) {
        return res.status(404).json({ message: 'Facility not found' })
    }

    await expireMemberships(db)

    const membership = await getActiveMembership(db, req.user.id)
    const discountPercent = membership
        ? Number(membership.booking_discount_percent)
        : 0

    const subtotal = Number(facilityRows[0].price_per_hour) * hours
    const membershipDiscount = Math.round(
        subtotal * (discountPercent / 100) * 100
    ) / 100
    const promoBase = Math.max(0, subtotal - membershipDiscount)

    const promotion = await findPromotionByCode(db, code)
    const evaluation = evaluatePromotion(promotion, {
        bookingDate: date,
        baseAmount: promoBase
    })

    if (evaluation.error) {
        return res.status(400).json({ message: evaluation.error })
    }

    const total = Math.max(0, promoBase - evaluation.discount)

    res.json({
        message: `${evaluation.promotion.title} applied — you save $${evaluation.discount.toFixed(2)}`,
        promotion: {
            id: evaluation.promotion.id,
            code: evaluation.promotion.code,
            title: evaluation.promotion.title,
            discount_type: evaluation.promotion.discount_type,
            discount_value: evaluation.promotion.discount_value
        },
        subtotal: subtotal.toFixed(2),
        membership_discount: membershipDiscount.toFixed(2),
        promotion_discount: evaluation.discount.toFixed(2),
        total: total.toFixed(2)
    })
})
