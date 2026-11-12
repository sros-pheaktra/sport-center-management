
const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MANAGER_ROLES = ['admin', 'manager']
const LATE_AFTER_MINUTES = 15

const ATTENDANCE_SELECT = `
    SELECT
        a.id,
        a.user_id,
        u.full_name AS staff_name,
        u.email AS staff_email,
        u.role AS staff_role,
        a.work_date,
        a.clock_in,
        a.clock_out,
        a.status,
        a.created_at,
        a.updated_at,
        (SELECT MIN(s.starts_at) FROM staff_schedules s
         WHERE s.user_id = a.user_id
           AND s.work_date = a.work_date) AS shift_start,
        (SELECT MAX(s.ends_at) FROM staff_schedules s
         WHERE s.user_id = a.user_id
           AND s.work_date = a.work_date) AS shift_end
    FROM attendance a
    JOIN users u ON a.user_id = u.id
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

// Today's local date as YYYY-MM-DD (matches MySQL CURDATE for the
// server's timezone).
const todayValue = () => {
    const now = new Date()
    const pad = (value) => String(value).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const selectAttendanceById = async (id) => {
    const [rows] = await db.query(
        `${ATTENDANCE_SELECT} WHERE a.id = ?`,
        [id]
    )
    return rows[0] || null
}

// GET /api/attendance?from=&to=&user_id=&date=   (managers all, staff own)
exports.listAttendance = asyncHandler(async (req, res) => {
    const date = (req.query.date || '').trim()
    const from = (req.query.from || '').trim()
    const to = (req.query.to || '').trim()
    const userId = req.query.user_id

    const conditions = []
    const params = []

    if (!isManager(req.user)) {
        conditions.push('a.user_id = ?')
        params.push(req.user.id)
    } else if (userId !== undefined && userId !== '') {
        const parsed = Number.parseInt(userId, 10)
        if (!Number.isInteger(parsed) || parsed < 1) {
            return res.status(400).json({ message: 'Invalid staff filter' })
        }
        conditions.push('a.user_id = ?')
        params.push(parsed)
    }

    if (date) {
        if (!isRealDate(date)) {
            return res.status(400).json({ message: 'Invalid attendance date' })
        }
        conditions.push('a.work_date = ?')
        params.push(date)
    } else {
        if (from) {
            if (!isRealDate(from)) {
                return res.status(400).json({ message: 'Invalid from date' })
            }
            conditions.push('a.work_date >= ?')
            params.push(from)
        }

        if (to) {
            if (!isRealDate(to)) {
                return res.status(400).json({ message: 'Invalid to date' })
            }
            conditions.push('a.work_date <= ?')
            params.push(to)
        }
    }

    const whereSql = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : ''

    const [attendance] = await db.query(
        `${ATTENDANCE_SELECT}
         ${whereSql}
         ORDER BY a.work_date DESC, a.clock_in DESC, u.full_name ASC
         LIMIT 500`,
        params
    )

    res.json({ attendance })
})

// GET /api/attendance/today   (staff-side: own row + today's shift)
exports.getMyToday = asyncHandler(async (req, res) => {
    const today = todayValue()

    const [rows] = await db.query(
        `${ATTENDANCE_SELECT} WHERE a.user_id = ? AND a.work_date = ?`,
        [req.user.id, today]
    )

    const [shifts] = await db.query(
        `SELECT id, starts_at, ends_at, notes
         FROM staff_schedules
         WHERE user_id = ? AND work_date = ?
         ORDER BY starts_at ASC`,
        [req.user.id, today]
    )

    res.json({
        date: today,
        attendance: rows[0] || null,
        shifts
    })
})

// POST /api/attendance/clock-in   (staff-side)
exports.clockIn = asyncHandler(async (req, res) => {
    const today = todayValue()

    const [existing] = await db.query(
        'SELECT id, clock_in, clock_out FROM attendance WHERE user_id = ? AND work_date = ?',
        [req.user.id, today]
    )

    if (existing.length > 0 && existing[0].clock_in) {
        return res.status(409).json({
            message: 'You have already clocked in today'
        })
    }

    // A clock-in more than 15 minutes after the first shift starts is late.
    const [shiftRows] = await db.query(
        `SELECT MIN(starts_at) AS shift_start
         FROM staff_schedules
         WHERE user_id = ? AND work_date = ?`,
        [req.user.id, today]
    )

    let status = 'present'
    const shiftStart = shiftRows[0]?.shift_start

    if (shiftStart) {
        const [diffRows] = await db.query(
            `SELECT TIMESTAMPDIFF(
                        SECOND,
                        TIMESTAMP(CURDATE(), ?),
                        NOW()
                    ) AS seconds_late`,
            [shiftStart]
        )

        if (Number(diffRows[0].seconds_late) > LATE_AFTER_MINUTES * 60) {
            status = 'late'
        }
    }

    let attendanceId

    if (existing.length > 0) {
        // Defensive: a row without a clock-in can be filled in.
        await db.query(
            `UPDATE attendance
             SET clock_in = NOW(), status = ?
             WHERE id = ?`,
            [status, existing[0].id]
        )
        attendanceId = existing[0].id
    } else {
        const [result] = await db.query(
            `INSERT INTO attendance (user_id, work_date, clock_in, status)
             VALUES (?, ?, NOW(), ?)`,
            [req.user.id, today, status]
        )
        attendanceId = result.insertId
    }

    res.status(201).json({
        message: status === 'late'
            ? 'Clocked in — marked late'
            : 'Clocked in',
        attendance: await selectAttendanceById(attendanceId)
    })
})

// POST /api/attendance/clock-out   (staff-side)
exports.clockOut = asyncHandler(async (req, res) => {
    const today = todayValue()

    const [rows] = await db.query(
        `SELECT id, clock_in, clock_out FROM attendance
         WHERE user_id = ? AND work_date = ?`,
        [req.user.id, today]
    )

    if (rows.length === 0 || !rows[0].clock_in) {
        return res.status(400).json({
            message: 'You have not clocked in today'
        })
    }

    if (rows[0].clock_out) {
        return res.status(400).json({
            message: 'You have already clocked out today'
        })
    }

    await db.query(
        'UPDATE attendance SET clock_out = NOW() WHERE id = ?',
        [rows[0].id]
    )

    res.json({
        message: 'Clocked out',
        attendance: await selectAttendanceById(rows[0].id)
    })
})
