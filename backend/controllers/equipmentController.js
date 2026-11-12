
const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')
const { createNotification } = require('../utils/notification')

const CONDITIONS = ['excellent', 'good', 'fair', 'poor']
const STATUSES = ['available', 'rented', 'maintenance', 'retired']
const RENTAL_STATUSES = ['rented', 'returned', 'overdue', 'lost']
const ACTIVE_RENTAL_STATUSES = ['rented', 'overdue']
const STAFF_ROLES = ['admin', 'manager', 'staff']

const EQUIPMENT_SELECT = `
    SELECT
        e.id,
        e.name,
        e.description,
        e.item_condition,
        e.status,
        e.rental_fee,
        e.created_at,
        e.updated_at,
        (SELECT COUNT(*) FROM equipment_rentals er
         WHERE er.equipment_id = e.id
           AND er.status IN ('rented', 'overdue')) AS active_rentals
    FROM equipment_items e
`

const RENTAL_SELECT = `
    SELECT
        er.id,
        er.equipment_id,
        e.name AS equipment_name,
        e.item_condition,
        er.user_id,
        u.full_name AS customer_name,
        u.email AS customer_email,
        er.reservation_id,
        r.reference,
        er.rented_at,
        er.due_at,
        er.returned_at,
        er.fee,
        er.status,
        er.created_at,
        CASE
            WHEN er.status IN ('rented', 'overdue') AND er.due_at < NOW() THEN TRUE
            ELSE FALSE
        END AS is_overdue
    FROM equipment_rentals er
    JOIN equipment_items e ON er.equipment_id = e.id
    JOIN users u ON er.user_id = u.id
    LEFT JOIN reservations r ON er.reservation_id = r.id
`

const isStaff = (user) => STAFF_ROLES.includes(user.role)

const selectEquipmentById = async (id, executor = db) => {
    const [rows] = await executor.query(
        `${EQUIPMENT_SELECT} WHERE e.id = ?`,
        [id]
    )
    return rows[0] || null
}

const selectRentalById = async (id) => {
    const [rows] = await db.query(
        `${RENTAL_SELECT} WHERE er.id = ?`,
        [id]
    )
    return rows[0] || null
}

// Marks active rentals as overdue lazily (no background scheduler).
const markOverdueRentals = async () => {
    await db.query(
        `UPDATE equipment_rentals
         SET status = 'overdue'
         WHERE status = 'rented' AND due_at < NOW()`
    )
}

const validateEquipment = (body) => {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string'
        ? body.description.trim()
        : ''
    const itemCondition = typeof body.item_condition === 'string'
        ? body.item_condition
        : 'good'
    const status = typeof body.status === 'string' && body.status
        ? body.status
        : 'available'
    const rentalFee = Number(body.rental_fee)

    if (name.length < 2 || name.length > 100) {
        return { error: 'Equipment name must be between 2 and 100 characters' }
    }

    if (description.length > 500) {
        return { error: 'Description must be 500 characters or fewer' }
    }

    if (!CONDITIONS.includes(itemCondition)) {
        return { error: 'Invalid equipment condition' }
    }

    if (!STATUSES.includes(status)) {
        return { error: 'Invalid equipment status' }
    }

    if (!Number.isFinite(rentalFee) || rentalFee < 0 || rentalFee > 9999.99) {
        return { error: 'Daily rental fee must be between 0 and 9999.99' }
    }

    return {
        values: {
            name,
            description: description || null,
            itemCondition,
            status,
            rentalFee: rentalFee.toFixed(2)
        }
    }
}

// GET /api/equipment?status=&search=   (public catalogue)
exports.listEquipment = asyncHandler(async (req, res) => {
    const status = (req.query.status || '').trim()
    const search = (req.query.search || '').trim()

    const conditions = []
    const params = []

    if (status) {
        if (!STATUSES.includes(status)) {
            return res.status(400).json({ message: 'Invalid equipment status filter' })
        }
        conditions.push('e.status = ?')
        params.push(status)
    }

    if (search) {
        conditions.push('(e.name LIKE ? OR e.description LIKE ?)')
        params.push(`%${search}%`, `%${search}%`)
    }

    const whereSql = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : ''

    const [equipment] = await db.query(
        `${EQUIPMENT_SELECT}
         ${whereSql}
         ORDER BY FIELD(e.status, 'available', 'rented', 'maintenance', 'retired'),
                  e.name ASC`,
        params
    )

    res.json({ equipment })
})

// GET /api/equipment/:id   (public)
exports.getEquipment = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid equipment id' })
    }

    const item = await selectEquipmentById(id)

    if (!item) {
        return res.status(404).json({ message: 'Equipment not found' })
    }

    res.json({ equipment: item })
})

// POST /api/equipment   (admin/manager)
exports.createEquipment = asyncHandler(async (req, res) => {
    const validation = validateEquipment(req.body)

    if (validation.error) {
        return res.status(400).json({ message: validation.error })
    }

    const { name, description, itemCondition, status, rentalFee } = validation.values

    const [result] = await db.query(
        `INSERT INTO equipment_items
            (name, description, item_condition, status, rental_fee)
         VALUES (?, ?, ?, ?, ?)`,
        [name, description, itemCondition, status, rentalFee]
    )

    res.status(201).json({
        message: 'Equipment added',
        equipment: await selectEquipmentById(result.insertId)
    })
})

// PUT /api/equipment/:id   (admin/manager)
exports.updateEquipment = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid equipment id' })
    }

    const existing = await selectEquipmentById(id)

    if (!existing) {
        return res.status(404).json({ message: 'Equipment not found' })
    }

    const validation = validateEquipment(req.body)

    if (validation.error) {
        return res.status(400).json({ message: validation.error })
    }

    const { name, description, itemCondition, status, rentalFee } = validation.values

    // An item that is out on loan must stay 'rented' until it returns.
    if (Number(existing.active_rentals) > 0 && status !== 'rented') {
        return res.status(409).json({
            message: 'Return the active rental before changing this item’s status'
        })
    }

    await db.query(
        `UPDATE equipment_items
         SET name = ?, description = ?, item_condition = ?,
             status = ?, rental_fee = ?
         WHERE id = ?`,
        [name, description, itemCondition, status, rentalFee, id]
    )

    res.json({
        message: 'Equipment updated',
        equipment: await selectEquipmentById(id)
    })
})

// DELETE /api/equipment/:id   (admin/manager)
exports.deleteEquipment = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid equipment id' })
    }

    const existing = await selectEquipmentById(id)

    if (!existing) {
        return res.status(404).json({ message: 'Equipment not found' })
    }

    if (Number(existing.active_rentals) > 0) {
        return res.status(409).json({
            message: 'This item is currently rented and cannot be deleted'
        })
    }

    await db.query('DELETE FROM equipment_items WHERE id = ?', [id])

    res.json({ message: 'Equipment deleted' })
})

// POST /api/equipment/:id/rent   (customer)
// Body: { days: 1..30, reservation_id?: number }
exports.rentEquipment = asyncHandler(async (req, res) => {
    const equipmentId = Number.parseInt(req.params.id, 10)
    const days = Number.parseInt(req.body?.days, 10)

    if (!Number.isInteger(equipmentId) || equipmentId < 1) {
        return res.status(400).json({ message: 'Invalid equipment id' })
    }

    if (!Number.isInteger(days) || days < 1 || days > 30) {
        return res.status(400).json({ message: 'Please choose between 1 and 30 rental days' })
    }

    let reservationId = null

    if (
        req.body?.reservation_id !== undefined &&
        req.body.reservation_id !== null &&
        req.body.reservation_id !== ''
    ) {
        reservationId = Number.parseInt(req.body.reservation_id, 10)

        if (!Number.isInteger(reservationId) || reservationId < 1) {
            return res.status(400).json({ message: 'Invalid booking to attach' })
        }
    }

    const connection = await db.getConnection()

    try {
        await connection.beginTransaction()

        const [rows] = await connection.query(
            `SELECT id, name, status, rental_fee
             FROM equipment_items WHERE id = ? FOR UPDATE`,
            [equipmentId]
        )

        if (rows.length === 0) {
            await connection.rollback()
            return res.status(404).json({ message: 'Equipment not found' })
        }

        const item = rows[0]

        if (item.status !== 'available') {
            await connection.rollback()
            return res.status(409).json({
                message: 'This item is not available to rent right now'
            })
        }

        if (reservationId) {
            const [reservationRows] = await connection.query(
                `SELECT id, reference FROM reservations
                 WHERE id = ? AND user_id = ? AND status <> 'cancelled'`,
                [reservationId, req.user.id]
            )

            if (reservationRows.length === 0) {
                await connection.rollback()
                return res.status(400).json({
                    message: 'That booking does not belong to you'
                })
            }
        }

        const fee = Math.round(Number(item.rental_fee) * days * 100) / 100
        const dueAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

        const [result] = await connection.query(
            `INSERT INTO equipment_rentals
                (equipment_id, user_id, reservation_id, rented_at, due_at, fee, status)
             VALUES (?, ?, ?, NOW(), ?, ?, 'rented')`,
            [equipmentId, req.user.id, reservationId, dueAt, fee.toFixed(2)]
        )

        await connection.query(
            `UPDATE equipment_items SET status = 'rented' WHERE id = ?`,
            [equipmentId]
        )

        await createNotification(connection, {
            userId: req.user.id,
            type: 'reservation',
            title: 'Equipment rented',
            message: `${item.name} is reserved until ${dueAt.toLocaleDateString('en-GB')}. Return it at the front desk.`,
            link: '/equipment'
        })

        await connection.commit()

        res.status(201).json({
            message: `${item.name} rented — return it within ${days} day${days === 1 ? '' : 's'}`,
            rental: await selectRentalById(result.insertId)
        })
    } catch (error) {
        await connection.rollback()
        throw error
    } finally {
        connection.release()
    }
})

// GET /api/rentals?status=&mine=   (staff+ all, customers own)
exports.listRentals = asyncHandler(async (req, res) => {
    await markOverdueRentals()

    const status = (req.query.status || '').trim()
    const mine = req.query.mine === '1' || req.query.mine === 'true'

    const conditions = []
    const params = []

    if (!isStaff(req.user) || mine) {
        conditions.push('er.user_id = ?')
        params.push(req.user.id)
    }

    if (status) {
        if (!RENTAL_STATUSES.includes(status)) {
            return res.status(400).json({ message: 'Invalid rental status filter' })
        }
        conditions.push('er.status = ?')
        params.push(status)
    }

    const whereSql = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : ''

    const [rentals] = await db.query(
        `${RENTAL_SELECT}
         ${whereSql}
         ORDER BY FIELD(er.status, 'overdue', 'rented', 'returned', 'lost'),
                  er.due_at ASC, er.id DESC
         LIMIT 500`,
        params
    )

    res.json({ rentals })
})

// POST /api/rentals/:id/return   (staff+)
exports.returnRental = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid rental id' })
    }

    const connection = await db.getConnection()

    try {
        await connection.beginTransaction()

        const [rows] = await connection.query(
            `SELECT er.id, er.user_id, er.equipment_id, er.status, er.due_at,
                    e.name AS equipment_name
             FROM equipment_rentals er
             JOIN equipment_items e ON er.equipment_id = e.id
             WHERE er.id = ? FOR UPDATE`,
            [id]
        )

        if (rows.length === 0) {
            await connection.rollback()
            return res.status(404).json({ message: 'Rental not found' })
        }

        const rental = rows[0]

        if (!ACTIVE_RENTAL_STATUSES.includes(rental.status)) {
            await connection.rollback()
            return res.status(400).json({
                message: 'Only active rentals can be returned'
            })
        }

        const wasOverdue = new Date(rental.due_at).getTime() < Date.now()

        await connection.query(
            `UPDATE equipment_rentals
             SET status = 'returned', returned_at = NOW()
             WHERE id = ?`,
            [id]
        )

        await connection.query(
            `UPDATE equipment_items
             SET status = 'available'
             WHERE id = ? AND status = 'rented'`,
            [rental.equipment_id]
        )

        await createNotification(connection, {
            userId: rental.user_id,
            type: 'reservation',
            title: 'Equipment returned',
            message: `${rental.equipment_name} was returned. Thanks!`,
            link: '/equipment'
        })

        await connection.commit()

        res.json({
            message: wasOverdue
                ? 'Rental returned (it was overdue)'
                : 'Rental returned',
            rental: await selectRentalById(id)
        })
    } catch (error) {
        await connection.rollback()
        throw error
    } finally {
        connection.release()
    }
})
