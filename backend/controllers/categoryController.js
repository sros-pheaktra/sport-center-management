
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
