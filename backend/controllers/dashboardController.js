
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
        [recentUsers], [recentFacilities],
        [todayBookingRows], [openMaintenanceRows], [activeMemberRows],
        [revenueRows], [pendingPaymentRows],
        [equipmentRows], [activeRentalRows], [overdueRentalRows],
        [reviewRows], [unreadNotifRows]
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
        ),
        db.query(
            `SELECT COUNT(*) AS count FROM reservations
             WHERE DATE(starts_at) = CURDATE()
               AND status IN ('pending', 'confirmed', 'checked_in')`
        ),
        db.query(
            `SELECT COUNT(*) AS count FROM maintenance_requests
             WHERE status IN ('open', 'in_progress')`
        ),
        db.query(
            `SELECT COUNT(*) AS count FROM memberships
             WHERE status = 'active' AND ends_on >= CURDATE()`
        ),
        db.query(
            `SELECT COALESCE(SUM(amount), 0) AS total
             FROM payments
             WHERE status = 'paid'
               AND paid_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`
        ),
        db.query(
            `SELECT COUNT(*) AS count FROM payments
             WHERE status = 'pending' AND method = 'at_center'`
        ),
        db.query(
            `SELECT
                COUNT(*) AS total,
                SUM(status = 'available') AS available,
                SUM(status = 'rented') AS rented,
                SUM(status = 'maintenance') AS maintenance
             FROM equipment_items`
        ),
        db.query(
            `SELECT COUNT(*) AS count FROM equipment_rentals
             WHERE status IN ('rented', 'overdue')`
        ),
        db.query(
            `SELECT COUNT(*) AS count FROM equipment_rentals
             WHERE status IN ('rented', 'overdue') AND due_at < NOW()`
        ),
        db.query(
            `SELECT COUNT(*) AS count,
                    COALESCE(ROUND(AVG(rating), 1), 0) AS average
             FROM reviews`
        ),
        db.query(
            `SELECT COUNT(*) AS count FROM notifications
             WHERE user_id = ? AND is_read = FALSE`,
            [req.user.id]
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

    const equipment = equipmentRows[0]

    res.json({
        stats: {
            total_users,
            users_by_role,
            total_facilities,
            facilities_by_status,
            total_categories,
            today_bookings: todayBookingRows[0].count,
            open_maintenance: openMaintenanceRows[0].count,
            active_memberships: activeMemberRows[0].count,
            revenue_this_month: revenueRows[0].total,
            pending_payments: pendingPaymentRows[0].count,
            total_equipment: Number(equipment.total || 0),
            available_equipment: Number(equipment.available || 0),
            rented_equipment: Number(equipment.rented || 0),
            active_rentals: activeRentalRows[0].count,
            overdue_rentals: overdueRentalRows[0].count,
            total_reviews: Number(reviewRows[0].count),
            average_rating: Number(reviewRows[0].average),
            unread_notifications: unreadNotifRows[0].count
        },
        recent_users: recentUsers,
        recent_facilities: recentFacilities
    })
})
