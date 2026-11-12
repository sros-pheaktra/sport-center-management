
const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')
const { createNotification } = require('../utils/notification')

const PRIORITIES = ['low', 'medium', 'high']
const STATUSES = ['open', 'in_progress', 'resolved', 'closed']
const ACTIVE_STATUSES = ['open', 'in_progress']
const MANAGER_ROLES = ['admin', 'manager']

const MAINTENANCE_SELECT = `
    SELECT
        m.id,
        m.facility_id,
        f.title AS facility_title,
        f.status AS facility_status,
        m.reported_by,
        reporter.full_name AS reported_by_name,
        m.assigned_to,
        assignee.full_name AS assigned_to_name,
        m.title,
        m.description,
        m.priority,
        m.status,
        m.resolution_notes,
        m.resolved_at,
        m.created_at,
        m.updated_at
    FROM maintenance_requests m
    JOIN facilities f ON m.facility_id = f.id
    JOIN users reporter ON m.reported_by = reporter.id
    LEFT JOIN users assignee ON m.assigned_to = assignee.id
`

const isManager = (user) => MANAGER_ROLES.includes(user.role)

// In-app heads-up for everyone who manages the centre.
const notifyManagers = async (executor, payload) => {
    const [rows] = await executor.query(
        `SELECT id FROM users
         WHERE role IN ('admin', 'manager') AND is_active = TRUE`
    )

    await Promise.all(rows.map((row) => createNotification(executor, {
        ...payload,
        userId: row.id
    })))
}

const selectRequestById = async (id) => {
    const [rows] = await db.query(
        `${MAINTENANCE_SELECT} WHERE m.id = ?`,
        [id]
    )
    return rows[0] || null
}

// Keeps facilities.status in sync with active maintenance work.
// Opening work puts the facility in 'maintenance'; once no active
// request remains it returns to 'available' (Phase 2 availability
// then allows bookings again).
const syncFacilityStatus = async (conn, facilityId, { setMaintenance }) => {
    if (setMaintenance) {
        await conn.query(
            `UPDATE facilities SET status = 'maintenance'
             WHERE id = ? AND status <> 'maintenance'`,
            [facilityId]
        )
        return
    }

    const [rows] = await conn.query(
        `SELECT COUNT(*) AS count FROM maintenance_requests
         WHERE facility_id = ? AND status IN ('open', 'in_progress')`,
        [facilityId]
    )

    if (Number(rows[0].count) === 0) {
        await conn.query(
            `UPDATE facilities SET status = 'available'
             WHERE id = ? AND status = 'maintenance'`,
            [facilityId]
        )
    }
}

// GET /api/maintenance?status=&priority=&facility_id=   (staff+)
exports.listRequests = asyncHandler(async (req, res) => {
    const status = (req.query.status || '').trim()
    const priority = (req.query.priority || '').trim()
    const facilityId = req.query.facility_id

    const conditions = []
    const params = []

    if (status) {
        if (!STATUSES.includes(status)) {
            return res.status(400).json({ message: 'Invalid status filter' })
        }
        conditions.push('m.status = ?')
        params.push(status)
    }

    if (priority) {
        if (!PRIORITIES.includes(priority)) {
            return res.status(400).json({ message: 'Invalid priority filter' })
        }
        conditions.push('m.priority = ?')
        params.push(priority)
    }

    if (facilityId !== undefined && facilityId !== '') {
        const parsed = Number.parseInt(facilityId, 10)
        if (!Number.isInteger(parsed) || parsed < 1) {
            return res.status(400).json({ message: 'Invalid facility filter' })
        }
        conditions.push('m.facility_id = ?')
        params.push(parsed)
    }

    const whereSql = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : ''

    const orderBy = `
        ORDER BY
            FIELD(m.status, 'open', 'in_progress', 'resolved', 'closed'),
            FIELD(m.priority, 'high', 'medium', 'low'),
            m.created_at DESC
    `

    const [requests] = await db.query(
        `${MAINTENANCE_SELECT} ${whereSql} ${orderBy} LIMIT 500`,
        params
    )

    res.json({ requests })
})

// POST /api/maintenance   (staff+)
exports.createRequest = asyncHandler(async (req, res) => {
    const facilityId = Number.parseInt(req.body?.facility_id, 10)
    const title = typeof req.body?.title === 'string'
        ? req.body.title.trim()
        : ''
    const description = typeof req.body?.description === 'string'
        ? req.body.description.trim()
        : ''
    const priority = typeof req.body?.priority === 'string'
        ? req.body.priority
        : 'medium'

    if (!Number.isInteger(facilityId) || facilityId < 1) {
        return res.status(400).json({ message: 'Please choose a valid facility' })
    }

    if (title.length < 5 || title.length > 150) {
        return res.status(400).json({
            message: 'Title must be between 5 and 150 characters'
        })
    }

    if (description.length < 10 || description.length > 1000) {
        return res.status(400).json({
            message: 'Description must be between 10 and 1000 characters'
        })
    }

    if (!PRIORITIES.includes(priority)) {
        return res.status(400).json({ message: 'Invalid priority' })
    }

    const connection = await db.getConnection()

    try {
        await connection.beginTransaction()

        const [facilityRows] = await connection.query(
            'SELECT id FROM facilities WHERE id = ? FOR UPDATE',
            [facilityId]
        )

        if (facilityRows.length === 0) {
            await connection.rollback()
            return res.status(404).json({ message: 'Facility not found' })
        }

        const [result] = await connection.query(
            `INSERT INTO maintenance_requests
                (facility_id, reported_by, title, description, priority, status)
             VALUES (?, ?, ?, ?, ?, 'open')`,
            [facilityId, req.user.id, title, description, priority]
        )

        await syncFacilityStatus(connection, facilityId, {
            setMaintenance: true
        })

        await createNotification(connection, {
            userId: req.user.id,
            type: 'maintenance',
            title: 'Maintenance request filed',
            message: `"${title}" was filed and the facility is now under maintenance.`,
            link: '/maintenance'
        })

        await notifyManagers(connection, {
            type: 'maintenance',
            title: 'Maintenance request needs attention',
            message: `"${title}" was filed by ${req.user.full_name}.`,
            link: '/maintenance'
        })

        await connection.commit()

        res.status(201).json({
            message: 'Maintenance request filed — the facility is now under maintenance',
            request: await selectRequestById(result.insertId)
        })
    } catch (error) {
        await connection.rollback()
        throw error
    } finally {
        connection.release()
    }
})

// PUT /api/maintenance/:id   (staff+ progress, manager+ resolve)
exports.updateRequest = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid maintenance id' })
    }

    const [rows] = await db.query(
        'SELECT * FROM maintenance_requests WHERE id = ?',
        [id]
    )

    if (rows.length === 0) {
        return res.status(404).json({ message: 'Maintenance request not found' })
    }

    const current = rows[0]
    const body = req.body || {}

    const title = body.title === undefined
        ? current.title
        : String(body.title).trim()
    const description = body.description === undefined
        ? current.description
        : String(body.description).trim()
    const priority = body.priority === undefined
        ? current.priority
        : String(body.priority)
    const status = body.status === undefined
        ? current.status
        : String(body.status)
    const resolutionNotes = body.resolution_notes === undefined
        ? current.resolution_notes
        : String(body.resolution_notes).trim()

    let assignedTo = current.assigned_to

    if (body.assigned_to !== undefined) {
        if (body.assigned_to === null || body.assigned_to === '') {
            assignedTo = null
        } else {
            const parsed = Number.parseInt(body.assigned_to, 10)
            if (!Number.isInteger(parsed) || parsed < 1) {
                return res.status(400).json({ message: 'Invalid assignee' })
            }
            const [userRows] = await db.query(
                'SELECT id FROM users WHERE id = ? AND role IN (?, ?, ?)',
                [parsed, 'admin', 'manager', 'staff']
            )
            if (userRows.length === 0) {
                return res.status(400).json({ message: 'Assignee not found' })
            }
            assignedTo = parsed
        }
    }

    if (title.length < 5 || title.length > 150) {
        return res.status(400).json({
            message: 'Title must be between 5 and 150 characters'
        })
    }

    if (description.length < 10 || description.length > 1000) {
        return res.status(400).json({
            message: 'Description must be between 10 and 1000 characters'
        })
    }

    if (!PRIORITIES.includes(priority)) {
        return res.status(400).json({ message: 'Invalid priority' })
    }

    if (!STATUSES.includes(status)) {
        return res.status(400).json({ message: 'Invalid maintenance status' })
    }

    if (resolutionNotes && resolutionNotes.length > 500) {
        return res.status(400).json({
            message: 'Resolution notes must be 500 characters or fewer'
        })
    }

    // Resolving/closing is a manager decision.
    if (['resolved', 'closed'].includes(status) && !isManager(req.user)) {
        return res.status(403).json({
            message: 'Only managers can resolve or close maintenance requests'
        })
    }

    const isNowFinished = ['resolved', 'closed'].includes(status)

    const connection = await db.getConnection()

    try {
        await connection.beginTransaction()

        await connection.query(
            `UPDATE maintenance_requests
             SET title = ?, description = ?, priority = ?, status = ?,
                 assigned_to = ?, resolution_notes = ?,
                 resolved_at = ?
             WHERE id = ?`,
            [
                title,
                description,
                priority,
                status,
                assignedTo,
                resolutionNotes || null,
                isNowFinished ? (current.resolved_at || new Date()) : null,
                id
            ]
        )

        await syncFacilityStatus(connection, current.facility_id, {
            setMaintenance: ACTIVE_STATUSES.includes(status)
        })

        // Tell the reporter when their report is dealt with…
        if (isNowFinished && !['resolved', 'closed'].includes(current.status)) {
            await createNotification(connection, {
                userId: current.reported_by,
                type: 'maintenance',
                title: 'Maintenance request resolved',
                message: `"${title}" was marked ${status}${resolutionNotes ? `: ${resolutionNotes}` : '.'}`,
                link: '/maintenance'
            })
        }

        // …and ping a newly assigned staff member.
        if (assignedTo && Number(assignedTo) !== Number(current.assigned_to)) {
            await createNotification(connection, {
                userId: assignedTo,
                type: 'maintenance',
                title: 'Maintenance request assigned to you',
                message: `"${title}" is now assigned to you.`,
                link: '/maintenance'
            })
        }

        await connection.commit()

        res.json({
            message: 'Maintenance request updated',
            request: await selectRequestById(id)
        })
    } catch (error) {
        await connection.rollback()
        throw error
    } finally {
        connection.release()
    }
})
