
const fs = require('fs')
const path = require('path')

const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')
const { UPLOADS_DIR } = require('../middleware/uploadMiddleware')

// The only status values a facility may have
const ALLOWED_STATUSES = ['available', 'unavailable']

// SELECT used for lists and details: joins the owner (users)
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
        f.created_at,
        f.updated_at
    FROM facilities f
    JOIN categories c ON f.category_id = c.id
    JOIN users u ON f.user_id = u.id
`

// Removes an image multer already saved when the request turns out
// to be invalid (e.g. a bad category id), so no orphan files remain.
const removeUploadedImage = (file) => {
    if (file && file.path) {
        fs.unlink(file.path, () => {})
    }
}

// Validates the facility fields coming from the client.
// Returns { values } on success or { error } with a readable message.
const validateFacility = ({ title, description, category_id, status }) => {
    const cleanTitle = typeof title === 'string' ? title.trim() : ''
    const cleanDescription = typeof description === 'string' ? description.trim() : ''
    const cleanCategoryId = Number.parseInt(category_id, 10)

    if (!cleanTitle) {
        return { error: 'Title is required' }
    }

    if (cleanTitle.length > 150) {
        return { error: 'Title must be 150 characters or fewer' }
    }

    if (!cleanDescription) {
        return { error: 'Description is required' }
    }

    if (!Number.isInteger(cleanCategoryId) || cleanCategoryId < 1) {
        return { error: 'Please choose a valid category' }
    }

    // The status may be omitted — new facilities default to available
    let cleanStatus = status
    if (cleanStatus === undefined || cleanStatus === null || cleanStatus === '') {
        cleanStatus = 'available'
    }

    if (!ALLOWED_STATUSES.includes(cleanStatus)) {
        return { error: 'Status must be either "available" or "unavailable"' }
    }

    return {
        values: {
            title: cleanTitle,
            description: cleanDescription,
            category_id: cleanCategoryId,
            status: cleanStatus
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

// POST /api/facilities  (logged in, multipart form with optional image)
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
        `INSERT INTO facilities (user_id, category_id, title, description, status, image)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            req.user.id,
            validation.values.category_id,
            validation.values.title,
            validation.values.description,
            validation.values.status,
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

// PUT /api/facilities/:id  (owner only, optional new image)
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

    // Server-side ownership check — hiding the buttons is not enough
    if (existing.user_id !== req.user.id) {
        removeUploadedImage(req.file)
        return res.status(403).json({
            message: 'You can only edit or delete your own facilities'
        })
    }

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
         SET title = ?, description = ?, category_id = ?, status = ?, image = ?
         WHERE id = ?`,
        [
            validation.values.title,
            validation.values.description,
            validation.values.category_id,
            validation.values.status,
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

// DELETE /api/facilities/:id  (owner only)
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

    // Server-side ownership check
    if (existing.user_id !== req.user.id) {
        return res.status(403).json({
            message: 'You can only edit or delete your own facilities'
        })
    }

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
