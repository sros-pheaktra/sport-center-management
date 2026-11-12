
const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

const MANAGER_ROLES = ['admin', 'manager']

const SCHEDULE_SELECT = `
    SELECT
        s.id,
        s.user_id,
        u.full_name AS staff_name,
        u.email AS staff_email,
        s.work_date,
        s.starts_at,
        s.ends_at,
        s.notes,
        s.created_at
    FROM staff_schedules s
    JOIN users u ON s.user_id = u.id
`

const isManager = (user) => MANAGER_ROLES.includes(user.role)

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

const validateShift = (body) => {
    const userId = Number.parseInt(body.user_id, 10)
    const workDate = typeof body.work_date === 'string' ? body.work_date.trim() : ''
    const startsAt = typeof body.starts_at === 'string' ? body.starts_at.trim() : ''
    const endsAt = typeof body.ends_at === 'string' ? body.ends_at.trim() : ''
    const notes = typeof body.notes === 'string' ? body.notes.trim() : ''

    if (!Number.isInteger(userId) || userId < 1) {
        return { error: 'Please choose a staff member' }
    }

    if (!isRealDate(workDate)) {
        return { error: 'Please choose a valid work date' }
    }

    if (!TIME_PATTERN.test(startsAt) || !TIME_PATTERN.test(endsAt)) {
        return { error: 'Please enter valid start and end times (HH:MM)' }
    }

    if (endsAt <= startsAt) {
        return { error: 'The shift must end after it starts' }
    }

    if (notes.length > 255) {
        return { error: 'Notes must be 255 characters or fewer' }
    }

    return {
        values: { userId, workDate, startsAt, endsAt, notes: notes || null }
    }
}

const isStaffTarget = async (userId) => {
    const [rows] = await db.query(
        'SELECT role, is_active FROM users WHERE id = ?',
        [userId]
    )

    if (rows.length === 0) return { error: 'Staff member not found' }
    if (rows[0].role !== 'staff') {
        return { error: 'Schedules can only be assigned to staff members' }
    }
    if (!rows[0].is_active) {
        return { error: 'That staff account is deactivated' }
    }

    return { ok: true }
}

// GET /api/schedules?from=&to=&user_id=   (managers all, staff own)
exports.listSchedules = asyncHandler(async (req, res) => {
    const from = (req.query.from || '').trim()
    const to = (req.query.to || '').trim()
    const userId = req.query.user_id

    const conditions = []
    const params = []

    if (!isManager(req.user)) {
        conditions.push('s.user_id = ?')
        params.push(req.user.id)
    } else if (userId !== undefined && userId !== '') {
        const parsed = Number.parseInt(userId, 10)
        if (!Number.isInteger(parsed) || parsed < 1) {
            return res.status(400).json({ message: 'Invalid staff filter' })
        }
        conditions.push('s.user_id = ?')
        params.push(parsed)
    }

    if (from) {
        if (!isRealDate(from)) {
            return res.status(400).json({ message: 'Invalid from date' })
        }
        conditions.push('s.work_date >= ?')
        params.push(from)
    }

    if (to) {
        if (!isRealDate(to)) {
            return res.status(400).json({ message: 'Invalid to date' })
        }
        conditions.push('s.work_date <= ?')
        params.push(to)
    }

    const whereSql = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : ''

    const [schedules] = await db.query(
        `${SCHEDULE_SELECT}
         ${whereSql}
         ORDER BY s.work_date ASC, s.starts_at ASC, u.full_name ASC
         LIMIT 500`,
        params
    )

    res.json({ schedules })
})

// POST /api/schedules   (admin/manager)
exports.createSchedule = asyncHandler(async (req, res) => {
    const validation = validateShift(req.body)

    if (validation.error) {
        return res.status(400).json({ message: validation.error })
    }

    const { userId, workDate, startsAt, endsAt, notes } = validation.values

    const target = await isStaffTarget(userId)

    if (target.error) {
        return res.status(400).json({ message: target.error })
    }

    try {
        const [result] = await db.query(
            `INSERT INTO staff_schedules
                (user_id, work_date, starts_at, ends_at, notes)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, workDate, `${startsAt}:00`, `${endsAt}:00`, notes]
        )

        const [rows] = await db.query(
            `${SCHEDULE_SELECT} WHERE s.id = ?`,
            [result.insertId]
        )

        res.status(201).json({
            message: 'Shift assigned',
            schedule: rows[0]
        })
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'That staff member already has a shift starting at this time'
            })
        }
        throw error
    }
})

// PUT /api/schedules/:id   (admin/manager)
exports.updateSchedule = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid shift id' })
    }

    const validation = validateShift(req.body)

    if (validation.error) {
        return res.status(400).json({ message: validation.error })
    }

    const { userId, workDate, startsAt, endsAt, notes } = validation.values

    const target = await isStaffTarget(userId)

    if (target.error) {
        return res.status(400).json({ message: target.error })
    }

    try {
        const [result] = await db.query(
            `UPDATE staff_schedules
             SET user_id = ?, work_date = ?, starts_at = ?, ends_at = ?,
                 notes = ?
             WHERE id = ?`,
            [userId, workDate, `${startsAt}:00`, `${endsAt}:00`, notes, id]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Shift not found' })
        }

        const [rows] = await db.query(
            `${SCHEDULE_SELECT} WHERE s.id = ?`,
            [id]
        )

        res.json({ message: 'Shift updated', schedule: rows[0] })
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'That staff member already has a shift starting at this time'
            })
        }
        throw error
    }
})

// DELETE /api/schedules/:id   (admin/manager)
exports.deleteSchedule = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid shift id' })
    }

    const [result] = await db.query(
        'DELETE FROM staff_schedules WHERE id = ?',
        [id]
    )

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Shift not found' })
    }

    res.json({ message: 'Shift removed' })
})
