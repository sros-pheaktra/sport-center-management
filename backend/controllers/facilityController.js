
const fs = require('fs')
const path = require('path')

const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')
const { UPLOADS_DIR } = require('../middleware/uploadMiddleware')

// The only status values a facility may have
const ALLOWED_STATUSES = ['available', 'unavailable', 'maintenance']

// SELECT used for lists and details: joins the creator (users)
// and the category so pages can show their names.
const FACILITY_SELECT = `
    SELECT
        f.id,
        f.title,
        f.description,
        f.status,
        f.image,
        f.category_id,
        c.name AS category_name,
        f.user_id,
        u.full_name AS owner_name,
        f.price_per_hour,
        f.capacity,
        f.open_time,
        f.close_time,
        (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv
         WHERE rv.facility_id = f.id) AS rating_avg,
        (SELECT COUNT(*) FROM reviews rv
         WHERE rv.facility_id = f.id) AS review_count,
        f.created_at,
        f.updated_at
    FROM facilities f
    JOIN categories c ON f.category_id = c.id
    JOIN users u ON f.user_id = u.id
`

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

// Removes an image multer already saved when the request turns out
// to be invalid (e.g. a bad category id), so no orphan files remain.
const removeUploadedImage = (file) => {
    if (file && file.path) {
        fs.unlink(file.path, () => {})
    }
}

// Normalises "HH:MM" to "HH:MM:SS" for MySQL TIME columns
const normalizeTime = (value) => {
    const time = String(value).trim()
    return time.length === 5 ? `${time}:00` : time
}

// Validates the facility fields coming from the client.
// Returns { values } on success or { error } with a readable message.
const validateFacility = ({
    title, description, category_id, status,
    price_per_hour, capacity, open_time, close_time
}) => {
    const cleanTitle = typeof title === 'string' ? title.trim() : ''
    const cleanDescription = typeof description === 'string' ? description.trim() : ''

    if (!cleanTitle) {
        return { error: 'Title is required' }
    }

    if (cleanTitle.length > 150) {
        return { error: 'Title must be 150 characters or fewer' }
    }

    if (!cleanDescription) {
        return { error: 'Description is required' }
    }

    const cleanCategoryId = Number.parseInt(category_id, 10)

    if (!Number.isInteger(cleanCategoryId) || cleanCategoryId < 1) {
        return { error: 'Please choose a valid category' }
    }

    // The status may be omitted — new facilities default to available
    let cleanStatus = status
    if (cleanStatus === undefined || cleanStatus === null || cleanStatus === '') {
        cleanStatus = 'available'
    }

    if (!ALLOWED_STATUSES.includes(cleanStatus)) {
        return {
            error: 'Status must be "available", "unavailable" or "maintenance"'
        }
    }

    // Hourly price used for booking totals (Phase 2)
    const cleanPrice = Number(price_per_hour)

    if (price_per_hour === undefined || price_per_hour === null || price_per_hour === ''
        || !Number.isFinite(cleanPrice)) {
        return { error: 'Please enter a valid price per hour' }
    }

    if (cleanPrice < 0 || cleanPrice > 99999.99) {
        return { error: 'Price per hour must be between 0 and 99999.99' }
    }

    // Optional capacity
    let cleanCapacity = null

    if (capacity !== undefined && capacity !== null && capacity !== '') {
        const parsedCapacity = Number.parseInt(capacity, 10)

        if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1 || parsedCapacity > 100000) {
            return { error: 'Capacity must be a whole number of at least 1' }
        }

        cleanCapacity = parsedCapacity
    }

    // Bookable hours — default to 08:00–22:00
    let cleanOpenTime = open_time === undefined || open_time === null || open_time === ''
        ? '08:00'
        : open_time
    let cleanCloseTime = close_time === undefined || close_time === null || close_time === ''
        ? '22:00'
        : close_time

    if (!TIME_PATTERN.test(String(cleanOpenTime)) || !TIME_PATTERN.test(String(cleanCloseTime))) {
        return { error: 'Opening and closing times must be valid times (HH:MM)' }
    }

    cleanOpenTime = normalizeTime(cleanOpenTime)
    cleanCloseTime = normalizeTime(cleanCloseTime)

    if (cleanCloseTime <= cleanOpenTime) {
        return { error: 'Closing time must be after opening time' }
    }

    return {
        values: {
            title: cleanTitle,
            description: cleanDescription,
            category_id: cleanCategoryId,
            status: cleanStatus,
            price_per_hour: cleanPrice.toFixed(2),
            capacity: cleanCapacity,
            open_time: cleanOpenTime,
            close_time: cleanCloseTime
        }
    }
}

// Checks that the category the client submitted really exists.
const categoryExists = async (categoryId) => {
    const [categories] = await db.query(
        'SELECT id FROM categories WHERE id = ?',
        [categoryId]
    )
    return categories.length > 0
}

// GET /api/facilities?search=&category_id=&status=
// Keyword search (title/description) and/or category filter.
exports.getFacilities = asyncHandler(async (req, res) => {
    const search = (req.query.search || '').trim()
    const categoryId = req.query.category_id
    const status = (req.query.status || '').trim()

    const conditions = []
    const params = []

    if (search) {
        conditions.push('(f.title LIKE ? OR f.description LIKE ?)')
        params.push(`%${search}%`, `%${search}%`)
    }

    if (categoryId !== undefined && categoryId !== '') {
        const parsed = Number.parseInt(categoryId, 10)

        if (!Number.isInteger(parsed) || parsed < 1) {
            return res.status(400).json({
                message: 'Invalid category filter'
            })
        }

        conditions.push('f.category_id = ?')
        params.push(parsed)
    }

    if (status) {
        if (!ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({
                message: 'Invalid status filter'
            })
        }

        conditions.push('f.status = ?')
        params.push(status)
    }

    const whereSql = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : ''

    const [facilities] = await db.query(
        `${FACILITY_SELECT}
         ${whereSql}
         ORDER BY f.created_at DESC, f.id DESC`,
        params
    )

    res.json({
        facilities
    })
})

// GET /api/facilities/:id
exports.getFacilityById = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            message: 'Invalid facility id'
        })
    }

    const [facilities] = await db.query(
        `${FACILITY_SELECT}
         WHERE f.id = ?`,
        [id]
    )

    if (facilities.length === 0) {
        return res.status(404).json({
            message: 'Facility not found. It may have been deleted.'
        })
    }

    res.json({
        facility: facilities[0]
    })
})

// POST /api/facilities  (admin/manager, multipart form with optional image)
exports.createFacility = asyncHandler(async (req, res) => {
    const validation = validateFacility(req.body)

    if (validation.error) {
        removeUploadedImage(req.file)
        return res.status(400).json({
            message: validation.error
        })
    }

    if (!(await categoryExists(validation.values.category_id))) {
        removeUploadedImage(req.file)
        return res.status(400).json({
            message: 'Selected category does not exist'
        })
    }

    // Optional image — a placeholder is shown on the site when null
    const image = req.file ? req.file.filename : null

    const [result] = await db.query(
        `INSERT INTO facilities
            (user_id, category_id, title, description, status,
             price_per_hour, capacity, open_time, close_time, image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            req.user.id,
            validation.values.category_id,
            validation.values.title,
            validation.values.description,
            validation.values.status,
            validation.values.price_per_hour,
            validation.values.capacity,
            validation.values.open_time,
            validation.values.close_time,
            image
        ]
    )

    const [facilities] = await db.query(
        `${FACILITY_SELECT}
         WHERE f.id = ?`,
        [result.insertId]
    )

    res.status(201).json({
        message: 'Facility created successfully',
        facility: facilities[0]
    })
})

// PUT /api/facilities/:id  (admin/manager, optional new image)
// Access is enforced by role on the route (authorize middleware):
// only admins and managers manage the center's facilities.
exports.updateFacility = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        removeUploadedImage(req.file)
        return res.status(400).json({
            message: 'Invalid facility id'
        })
    }

    const [existingRows] = await db.query(
        'SELECT * FROM facilities WHERE id = ?',
        [id]
    )

    if (existingRows.length === 0) {
        removeUploadedImage(req.file)
        return res.status(404).json({
            message: 'Facility not found. It may have been deleted.'
        })
    }

    const existing = existingRows[0]

    const validation = validateFacility(req.body)

    if (validation.error) {
        removeUploadedImage(req.file)
        return res.status(400).json({
            message: validation.error
        })
    }

    if (!(await categoryExists(validation.values.category_id))) {
        removeUploadedImage(req.file)
        return res.status(400).json({
            message: 'Selected category does not exist'
        })
    }

    // Keep the current image unless a new one was uploaded
    const image = req.file ? req.file.filename : existing.image

    await db.query(
        `UPDATE facilities
         SET title = ?, description = ?, category_id = ?, status = ?,
             price_per_hour = ?, capacity = ?, open_time = ?, close_time = ?,
             image = ?
         WHERE id = ?`,
        [
            validation.values.title,
            validation.values.description,
            validation.values.category_id,
            validation.values.status,
            validation.values.price_per_hour,
            validation.values.capacity,
            validation.values.open_time,
            validation.values.close_time,
            image,
            id
        ]
    )

    // The replaced image file is no longer needed
    if (req.file && existing.image) {
        fs.unlink(path.join(UPLOADS_DIR, existing.image), () => {})
    }

    const [facilities] = await db.query(
        `${FACILITY_SELECT}
         WHERE f.id = ?`,
        [id]
    )

    res.json({
        message: 'Facility updated successfully',
        facility: facilities[0]
    })
})

// DELETE /api/facilities/:id  (admin/manager)
exports.deleteFacility = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            message: 'Invalid facility id'
        })
    }

    const [existingRows] = await db.query(
        'SELECT * FROM facilities WHERE id = ?',
        [id]
    )

    if (existingRows.length === 0) {
        return res.status(404).json({
            message: 'Facility not found. It may have been deleted.'
        })
    }

    const existing = existingRows[0]

    await db.query(
        'DELETE FROM facilities WHERE id = ?',
        [id]
    )

    // Also remove the image file belonging to this facility
    if (existing.image) {
        fs.unlink(path.join(UPLOADS_DIR, existing.image), () => {})
    }

    res.json({
        message: 'Facility deleted successfully'
    })
})

// ---------------------------------------------------------
// Phase 2: hourly availability
// ---------------------------------------------------------

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const padNumber = (value) => String(value).padStart(2, '0')

const parseDateValue = (value) => {
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

const todayValue = () => {
    const now = new Date()
    return `${now.getFullYear()}-${padNumber(now.getMonth() + 1)}-${padNumber(now.getDate())}`
}

const nextDayValue = ({ year, month, day }) => {
    const next = new Date(year, month - 1, day + 1)
    return `${next.getFullYear()}-${padNumber(next.getMonth() + 1)}-${padNumber(next.getDate())}`
}

const toMinutes = (value) => {
    const [hours, minutes] = String(value).slice(0, 5).split(':').map(Number)
    return hours * 60 + minutes
}

const toClock = (minutes) =>
    `${padNumber(Math.floor(minutes / 60))}:${padNumber(minutes % 60)}`

// GET /api/facilities/:id/availability?date=YYYY-MM-DD
// Public: returns the facility's hourly grid for one day, marking
// slots that are in the past, already booked, or unavailable
// because the facility is closed/under maintenance.
exports.getFacilityAvailability = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            message: 'Invalid facility id'
        })
    }

    const dateValue = (req.query.date || '').trim() || todayValue()
    const parsedDate = parseDateValue(dateValue)

    if (!parsedDate) {
        return res.status(400).json({
            message: 'Please provide a valid date (YYYY-MM-DD)'
        })
    }

    const [facilities] = await db.query(
        `SELECT id, title, status, price_per_hour, open_time, close_time
         FROM facilities WHERE id = ?`,
        [id]
    )

    if (facilities.length === 0) {
        return res.status(404).json({
            message: 'Facility not found. It may have been deleted.'
        })
    }

    const facility = facilities[0]
    const openMinutes = toMinutes(facility.open_time)
    const closeMinutes = toMinutes(facility.close_time)

    const [takenRows] = await db.query(
        `SELECT UNIX_TIMESTAMP(starts_at) AS starts_ts,
                UNIX_TIMESTAMP(ends_at) AS ends_ts
         FROM reservations
         WHERE facility_id = ?
           AND status IN ('pending', 'confirmed', 'checked_in', 'completed', 'no_show')
           AND starts_at < ?
           AND ends_at > ?`,
        [facility.id, `${nextDayValue(parsedDate)} 00:00:00`, `${dateValue} 00:00:00`]
    )

    const nowSeconds = Date.now() / 1000
    const slots = []

    for (let start = openMinutes; start + 60 <= closeMinutes; start += 60) {
        const end = start + 60
        const startHour = Math.floor(start / 60)
        const startMinute = start % 60
        const slotStart = new Date(
            parsedDate.year,
            parsedDate.month - 1,
            parsedDate.day,
            startHour,
            startMinute
        ).getTime() / 1000
        const slotEnd = slotStart + 60 * 60

        let reason = null

        if (facility.status === 'maintenance') {
            reason = 'Facility is under maintenance'
        } else if (facility.status !== 'available') {
            reason = 'Facility is unavailable'
        } else if (slotStart <= nowSeconds) {
            reason = 'This slot has already started'
        } else {
            const taken = takenRows.some(
                (row) => Number(row.starts_ts) < slotEnd && Number(row.ends_ts) > slotStart
            )

            if (taken) reason = 'Already booked'
        }

        slots.push({
            start: toClock(start),
            end: toClock(end),
            available: !reason,
            reason
        })
    }

    res.json({
        facility: {
            id: facility.id,
            title: facility.title,
            status: facility.status,
            price_per_hour: facility.price_per_hour,
            open_time: facility.open_time,
            close_time: facility.close_time
        },
        date: dateValue,
        slots
    })
})
