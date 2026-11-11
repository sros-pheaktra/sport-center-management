
const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')

// GET /api/categories
// Used by the facility form (choose a category) and the browse
// filters. Includes the number of facilities per category.
exports.listCategories = asyncHandler(async (req, res) => {
    const [categories] = await db.query(
        `SELECT c.id, c.name, COUNT(f.id) AS facility_count
         FROM categories c
         LEFT JOIN facilities f ON f.category_id = c.id
         GROUP BY c.id, c.name
         ORDER BY c.name`
    )

    res.json({
        categories
    })
})

// Validates a category name. Returns { values } or { error }.
const validateCategory = ({ name }) => {
    const cleanName = typeof name === 'string' ? name.trim() : ''

    if (!cleanName) {
        return { error: 'Category name is required' }
    }

    if (cleanName.length > 100) {
        return { error: 'Category name must be 100 characters or fewer' }
    }

    return { values: { name: cleanName } }
}

// POST /api/categories   (admin, manager)
exports.createCategory = asyncHandler(async (req, res) => {
    const validation = validateCategory(req.body)

    if (validation.error) {
        return res.status(400).json({
            message: validation.error
        })
    }

    const { name } = validation.values

    const [existing] = await db.query(
        'SELECT id FROM categories WHERE name = ?',
        [name]
    )

    if (existing.length > 0) {
        return res.status(409).json({
            message: 'A category with this name already exists'
        })
    }

    const [result] = await db.query(
        'INSERT INTO categories (name) VALUES (?)',
        [name]
    )

    const [categories] = await db.query(
        'SELECT id, name FROM categories WHERE id = ?',
        [result.insertId]
    )

    res.status(201).json({
        message: 'Category created successfully',
        category: categories[0]
    })
})

// PUT /api/categories/:id   (admin, manager)
exports.updateCategory = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            message: 'Invalid category id'
        })
    }

    const validation = validateCategory(req.body)

    if (validation.error) {
        return res.status(400).json({
            message: validation.error
        })
    }

    const { name } = validation.values

    const [existingRows] = await db.query(
        'SELECT id FROM categories WHERE id = ?',
        [id]
    )

    if (existingRows.length === 0) {
        return res.status(404).json({
            message: 'Category not found. It may have been deleted.'
        })
    }

    const [duplicate] = await db.query(
        'SELECT id FROM categories WHERE name = ? AND id != ?',
        [name, id]
    )

    if (duplicate.length > 0) {
        return res.status(409).json({
            message: 'A category with this name already exists'
        })
    }

    await db.query(
        'UPDATE categories SET name = ? WHERE id = ?',
        [name, id]
    )

    const [categories] = await db.query(
        'SELECT id, name FROM categories WHERE id = ?',
        [id]
    )

    res.json({
        message: 'Category updated successfully',
        category: categories[0]
    })
})

// DELETE /api/categories/:id   (admin, manager)
// Blocked while facilities still use the category.
exports.deleteCategory = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            message: 'Invalid category id'
        })
    }

    const [existingRows] = await db.query(
        'SELECT id FROM categories WHERE id = ?',
        [id]
    )

    if (existingRows.length === 0) {
        return res.status(404).json({
            message: 'Category not found. It may have been deleted.'
        })
    }

    const [inUse] = await db.query(
        'SELECT COUNT(*) AS count FROM facilities WHERE category_id = ?',
        [id]
    )

    if (inUse[0].count > 0) {
        return res.status(409).json({
            message: `This category is still used by ${inUse[0].count} facilit${inUse[0].count === 1 ? 'y' : 'ies'} — reassign them first`
        })
    }

    await db.query(
        'DELETE FROM categories WHERE id = ?',
        [id]
    )

    res.json({
        message: 'Category deleted successfully'
    })
})
