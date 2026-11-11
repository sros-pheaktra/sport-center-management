
const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')

// GET /api/dashboard/stats   (admin, manager, staff)
// Aggregate numbers for the role-aware dashboard. Read-only and
// non-sensitive, so staff get it too.
exports.getStats = asyncHandler(async (req, res) => {
    // Each db.query resolves to [rows, fields], so one bracket
    // level per query pulls out just the rows.
    const [
        [userCountRows], [roleRows], [facilityRows], [categoryCountRows],
        [recentUsers], [recentFacilities]
    ] = await Promise.all([
        db.query('SELECT COUNT(*) AS total_users FROM users'),
        db.query(
            `SELECT role, COUNT(*) AS count
             FROM users GROUP BY role`
        ),
        db.query(
            `SELECT status, COUNT(*) AS count
             FROM facilities GROUP BY status`
        ),
        db.query('SELECT COUNT(*) AS total_categories FROM categories'),
        db.query(
            `SELECT id, full_name, email, role, is_active, created_at
             FROM users ORDER BY created_at DESC, id DESC LIMIT 5`
        ),
        db.query(
            `SELECT f.id, f.title, f.status, f.created_at, c.name AS category_name
             FROM facilities f
             JOIN categories c ON f.category_id = c.id
             ORDER BY f.created_at DESC, f.id DESC LIMIT 5`
        )
    ])

    const total_users = userCountRows[0].total_users
    const total_categories = categoryCountRows[0].total_categories

    const users_by_role = Object.fromEntries(
        roleRows.map((row) => [row.role, row.count])
    )

    const facilities_by_status = Object.fromEntries(
        facilityRows.map((row) => [row.status, row.count])
    )

    const total_facilities = facilityRows.reduce(
        (sum, row) => sum + row.count, 0
    )

    res.json({
        stats: {
            total_users,
            users_by_role,
            total_facilities,
            facilities_by_status,
            total_categories
        },
        recent_users: recentUsers,
        recent_facilities: recentFacilities
    })
})
