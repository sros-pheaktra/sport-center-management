
const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')
const { createNotification } = require('../utils/notification')
const {
    expireMemberships,
    getActiveMembership
} = require('../utils/membership')

const MEMBERSHIP_SELECT = `
    SELECT
        m.id,
        m.user_id,
        u.full_name AS customer_name,
        u.email AS customer_email,
        m.plan_id,
        p.name AS plan_name,
        p.price AS plan_price,
        p.booking_discount_percent,
        m.starts_on,
        m.ends_on,
        m.status,
        m.created_at
    FROM memberships m
    JOIN users u ON m.user_id = u.id
    JOIN membership_plans p ON m.plan_id = p.id
`

const isStaff = (user) => ['admin', 'manager', 'staff'].includes(user.role)

const selectMembershipById = async (id) => {
    const [rows] = await db.query(
        `${MEMBERSHIP_SELECT} WHERE m.id = ?`,
        [id]
    )
    return rows[0] || null
}

const validatePlan = (body) => {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string'
        ? body.description.trim()
        : ''
    const price = Number(body.price)
    const duration = Number.parseInt(body.duration_months, 10)
    const discount = Number(body.booking_discount_percent)

    if (name.length < 3 || name.length > 100) {
        return { error: 'Plan name must be between 3 and 100 characters' }
    }

    if (description.length > 500) {
        return { error: 'Description must be 500 characters or fewer' }
    }

    if (!Number.isFinite(price) || price <= 0 || price > 10000) {
        return { error: 'Price must be between 0.01 and 10000' }
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 24) {
        return { error: 'Duration must be between 1 and 24 months' }
    }

    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
        return { error: 'Booking discount must be between 0 and 100 percent' }
    }

    return {
        values: {
            name,
            description: description || null,
            price: price.toFixed(2),
            duration,
            discount: discount.toFixed(2),
            isActive: body.is_active === undefined ? true : Boolean(body.is_active)
        }
    }
}

// GET /api/membership-plans   (public — plans are marketing info)
exports.listPlans = asyncHandler(async (req, res) => {
    const [plans] = await db.query(
        `SELECT id, name, description, price, duration_months,
                booking_discount_percent, is_active, created_at
         FROM membership_plans
         ORDER BY price ASC, id ASC`
    )

    res.json({ plans })
})

// POST /api/membership-plans   (admin/manager)
exports.createPlan = asyncHandler(async (req, res) => {
    const validation = validatePlan(req.body)

    if (validation.error) {
        return res.status(400).json({ message: validation.error })
    }

    const { name, description, price, duration, discount, isActive } =
        validation.values

    try {
        const [result] = await db.query(
            `INSERT INTO membership_plans
                (name, description, price, duration_months,
                 booking_discount_percent, is_active)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, description, price, duration, discount, isActive]
        )

        const [rows] = await db.query(
            `SELECT id, name, description, price, duration_months,
                    booking_discount_percent, is_active, created_at
             FROM membership_plans WHERE id = ?`,
            [result.insertId]
        )

        res.status(201).json({
            message: 'Membership plan created',
            plan: rows[0]
        })
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'A plan with that name already exists'
            })
        }
        throw error
    }
})

// PUT /api/membership-plans/:id   (admin/manager)
exports.updatePlan = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid plan id' })
    }

    const validation = validatePlan(req.body)

    if (validation.error) {
        return res.status(400).json({ message: validation.error })
    }

    const { name, description, price, duration, discount, isActive } =
        validation.values

    try {
        const [result] = await db.query(
            `UPDATE membership_plans
             SET name = ?, description = ?, price = ?,
                 duration_months = ?, booking_discount_percent = ?,
                 is_active = ?
             WHERE id = ?`,
            [name, description, price, duration, discount, isActive, id]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Membership plan not found' })
        }

        const [rows] = await db.query(
            `SELECT id, name, description, price, duration_months,
                    booking_discount_percent, is_active, created_at
             FROM membership_plans WHERE id = ?`,
            [id]
        )

        res.json({ message: 'Membership plan updated', plan: rows[0] })
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'A plan with that name already exists'
            })
        }
        throw error
    }
})

// DELETE /api/membership-plans/:id   (admin/manager)
// Plans that customers already subscribed to are kept for history;
// deactivate them instead of deleting.
exports.deletePlan = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid plan id' })
    }

    const [membershipRows] = await db.query(
        'SELECT COUNT(*) AS count FROM memberships WHERE plan_id = ?',
        [id]
    )

    if (Number(membershipRows[0].count) > 0) {
        return res.status(409).json({
            message: 'This plan has memberships and cannot be deleted. Deactivate it instead.'
        })
    }

    const [result] = await db.query(
        'DELETE FROM membership_plans WHERE id = ?',
        [id]
    )

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Membership plan not found' })
    }

    res.json({ message: 'Membership plan deleted' })
})

// GET /api/memberships/mine   (logged in)
// The current active membership (used by the booking summary).
exports.getMyMembership = asyncHandler(async (req, res) => {
    await expireMemberships(db)

    const membership = await getActiveMembership(db, req.user.id)

    res.json({ membership })
})

// GET /api/memberships?mine=&status=&user_id=   (staff+ all, customers own)
exports.listMemberships = asyncHandler(async (req, res) => {
    await expireMemberships(db)

    const status = (req.query.status || '').trim()
    const userId = req.query.user_id

    const conditions = []
    const params = []

    if (!isStaff(req.user)) {
        conditions.push('m.user_id = ?')
        params.push(req.user.id)
    } else if (userId !== undefined && userId !== '') {
        const parsed = Number.parseInt(userId, 10)
        if (!Number.isInteger(parsed) || parsed < 1) {
            return res.status(400).json({ message: 'Invalid user filter' })
        }
        conditions.push('m.user_id = ?')
        params.push(parsed)
    }

    if (status) {
        if (!['active', 'expired', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid membership status filter' })
        }
        conditions.push('m.status = ?')
        params.push(status)
    }

    const whereSql = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : ''

    const [memberships] = await db.query(
        `${MEMBERSHIP_SELECT}
         ${whereSql}
         ORDER BY m.starts_on DESC, m.id DESC
         LIMIT 500`,
        params
    )

    res.json({ memberships })
})

// POST /api/memberships   (customer)
exports.createMembership = asyncHandler(async (req, res) => {
    const planId = Number.parseInt(req.body?.plan_id, 10)

    if (!Number.isInteger(planId) || planId < 1) {
        return res.status(400).json({ message: 'Please choose a valid plan' })
    }

    await expireMemberships(db)

    const [planRows] = await db.query(
        `SELECT id, name, duration_months, is_active
         FROM membership_plans WHERE id = ?`,
        [planId]
    )

    if (planRows.length === 0) {
        return res.status(404).json({ message: 'Membership plan not found' })
    }

    const plan = planRows[0]

    if (!plan.is_active) {
        return res.status(400).json({
            message: 'This membership plan is not available right now'
        })
    }

    const active = await getActiveMembership(db, req.user.id)

    if (active) {
        return res.status(409).json({
            message: `You already have an active membership (${active.plan_name}).`
        })
    }

    const [result] = await db.query(
        `INSERT INTO memberships (user_id, plan_id, starts_on, ends_on, status)
         VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), 'active')`,
        [req.user.id, planId, plan.duration_months]
    )

    await createNotification(db, {
        userId: req.user.id,
        type: 'membership',
        title: 'Membership activated',
        message: `Your ${plan.name} membership is active. The booking discount is applied automatically.`,
        link: '/memberships'
    })

    res.status(201).json({
        message: `You are now a ${plan.name} member`,
        membership: await selectMembershipById(result.insertId)
    })
})

// POST /api/memberships/:id/cancel   (admin/manager)
exports.cancelMembership = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid membership id' })
    }

    const [result] = await db.query(
        `UPDATE memberships SET status = 'cancelled'
         WHERE id = ? AND status = 'active'`,
        [id]
    )

    if (result.affectedRows === 0) {
        return res.status(400).json({
            message: 'Only active memberships can be cancelled'
        })
    }

    const membership = await selectMembershipById(id)

    await createNotification(db, {
        userId: membership.user_id,
        type: 'membership',
        title: 'Membership cancelled',
        message: `Your ${membership.plan_name} membership was cancelled by the centre.`,
        link: '/memberships'
    })

    res.json({
        message: 'Membership cancelled',
        membership
    })
})
