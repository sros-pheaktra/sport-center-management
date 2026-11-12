
const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')

const asNumber = (value) => Number(value) || 0

// Percentage change between two periods. A period with no history
// counts as +100% when it has activity now, otherwise 0%.
const growthPercent = (current, previous) => {
    const now = asNumber(current)
    const before = asNumber(previous)

    if (before === 0) return now > 0 ? 100 : 0

    return Math.round(((now - before) / before) * 1000) / 10
}

const mapSeries = (rows) => rows.map((row) => ({
    period: row.period,
    total: asNumber(row.total)
}))

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
        [reviewRows], [unreadNotifRows],
        [bookingTotalsRows], [totalRevenueRows], [occupiedRows],
        [equipmentMaintenanceRows],
        [bookingsThisMonthRows], [bookingsLastMonthRows], [revenueLastMonthRows],
        [bookingStatusRows], [todayBookingList],
        [bookingTrendRows], [revenueDailyRows], [revenueWeeklyRows],
        [revenueMonthlyRows],
        [recentBookings], [recentPayments], [recentMaintenance]
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
        ),
        // ---- Overview additions ----
        db.query(
            `SELECT COUNT(*) AS total,
                    COALESCE(SUM(status = 'pending'), 0) AS pending
             FROM reservations`
        ),
        db.query(
            `SELECT COALESCE(SUM(amount), 0) AS total
             FROM payments WHERE status = 'paid'`
        ),
        db.query(
            `SELECT COUNT(DISTINCT facility_id) AS count
             FROM reservations
             WHERE status IN ('confirmed', 'checked_in')
               AND NOW() >= starts_at AND NOW() < ends_at`
        ),
        db.query(
            `SELECT COUNT(*) AS count FROM equipment_items
             WHERE status = 'maintenance'`
        ),
        db.query(
            `SELECT COUNT(*) AS count FROM reservations
             WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`
        ),
        db.query(
            `SELECT COUNT(*) AS count FROM reservations
             WHERE created_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
               AND created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')`
        ),
        db.query(
            `SELECT COALESCE(SUM(amount), 0) AS total FROM payments
             WHERE status = 'paid'
               AND paid_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
               AND paid_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')`
        ),
        db.query(
            `SELECT status, COUNT(*) AS count
             FROM reservations GROUP BY status`
        ),
        db.query(
            `SELECT r.id, r.reference, r.starts_at, r.ends_at, r.status,
                    f.title AS facility_title,
                    u.full_name AS customer_name
             FROM reservations r
             JOIN facilities f ON r.facility_id = f.id
             JOIN users u ON r.user_id = u.id
             WHERE DATE(r.starts_at) = CURDATE()
               AND r.status <> 'cancelled'
             ORDER BY r.starts_at ASC, r.id ASC
             LIMIT 10`
        ),
        db.query(
            `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS period,
                    COUNT(*) AS total
             FROM reservations
             WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
             GROUP BY period ORDER BY period`
        ),
        db.query(
            `SELECT DATE_FORMAT(paid_at, '%Y-%m-%d') AS period,
                    COALESCE(SUM(amount), 0) AS total
             FROM payments
             WHERE status = 'paid'
               AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
             GROUP BY period ORDER BY period`
        ),
        db.query(
            `SELECT DATE_FORMAT(DATE_SUB(paid_at, INTERVAL WEEKDAY(paid_at) DAY), '%Y-%m-%d') AS period,
                    COALESCE(SUM(amount), 0) AS total
             FROM payments
             WHERE status = 'paid'
               AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 7 WEEK)
             GROUP BY period ORDER BY period`
        ),
        db.query(
            `SELECT DATE_FORMAT(paid_at, '%Y-%m') AS period,
                    COALESCE(SUM(amount), 0) AS total
             FROM payments
             WHERE status = 'paid'
               AND paid_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01')
             GROUP BY period ORDER BY period`
        ),
        db.query(
            `SELECT r.id, r.reference, r.status, r.created_at,
                    f.title AS facility_title,
                    u.full_name AS customer_name
             FROM reservations r
             JOIN facilities f ON r.facility_id = f.id
             JOIN users u ON r.user_id = u.id
             ORDER BY r.created_at DESC, r.id DESC
             LIMIT 5`
        ),
        db.query(
            `SELECT pay.id, pay.amount, pay.status, pay.created_at,
                    r.reference, u.full_name AS customer_name
             FROM payments pay
             JOIN reservations r ON pay.reservation_id = r.id
             JOIN users u ON r.user_id = u.id
             ORDER BY pay.created_at DESC, pay.id DESC
             LIMIT 5`
        ),
        db.query(
            `SELECT m.id, m.title, m.status, m.updated_at,
                    f.title AS facility_title
             FROM maintenance_requests m
             JOIN facilities f ON m.facility_id = f.id
             ORDER BY m.updated_at DESC, m.id DESC
             LIMIT 5`
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

    const booking_status = Object.fromEntries(
        bookingStatusRows.map((row) => [row.status, asNumber(row.count)])
    )

    const bookingsThisMonth = asNumber(bookingsThisMonthRows[0].count)
    const bookingsLastMonth = asNumber(bookingsLastMonthRows[0].count)
    const revenueThisMonth = asNumber(revenueRows[0].total)
    const revenueLastMonth = asNumber(revenueLastMonthRows[0].total)

    // One merged, newest-first activity feed for the overview.
    const recentActivity = [
        ...recentUsers.map((user) => ({
            id: `user-${user.id}`,
            type: 'member',
            title: `New ${user.role} account`,
            description: `${user.full_name} joined the center`,
            created_at: user.created_at,
            link: '/users'
        })),
        ...recentBookings.map((booking) => ({
            id: `booking-${booking.id}`,
            type: 'booking',
            title: `Booking ${booking.reference}`,
            description: `${booking.customer_name} · ${booking.facility_title}`,
            status: booking.status,
            created_at: booking.created_at,
            link: `/bookings/${booking.reference}`
        })),
        ...recentPayments.map((payment) => ({
            id: `payment-${payment.id}`,
            type: 'payment',
            title: `Payment ${payment.status}`,
            description: `${payment.customer_name} · $${asNumber(payment.amount).toFixed(2)} · ${payment.reference}`,
            created_at: payment.created_at,
            link: `/bookings/${payment.reference}`
        })),
        ...recentMaintenance.map((request) => ({
            id: `maintenance-${request.id}`,
            type: 'maintenance',
            title: request.title,
            description: `${request.facility_title} · ${String(request.status).replace('_', ' ')}`,
            created_at: request.updated_at,
            link: '/maintenance'
        }))
    ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8)

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
            revenue_this_month: revenueThisMonth,
            pending_payments: pendingPaymentRows[0].count,
            total_equipment: Number(equipment.total || 0),
            available_equipment: Number(equipment.available || 0),
            rented_equipment: Number(equipment.rented || 0),
            active_rentals: activeRentalRows[0].count,
            overdue_rentals: overdueRentalRows[0].count,
            total_reviews: Number(reviewRows[0].count),
            average_rating: Number(reviewRows[0].average),
            unread_notifications: unreadNotifRows[0].count,
            total_bookings: asNumber(bookingTotalsRows[0].total),
            pending_bookings: asNumber(bookingTotalsRows[0].pending),
            total_revenue: asNumber(totalRevenueRows[0].total),
            available_facilities: Number(facilities_by_status.available || 0),
            occupied_facilities: asNumber(occupiedRows[0].count),
            equipment_maintenance: asNumber(equipmentMaintenanceRows[0].count),
            bookings_this_month: bookingsThisMonth,
            bookings_last_month: bookingsLastMonth,
            revenue_last_month: revenueLastMonth,
            bookings_trend: growthPercent(bookingsThisMonth, bookingsLastMonth),
            revenue_trend: growthPercent(revenueThisMonth, revenueLastMonth),
            booking_status
        },
        today_bookings: todayBookingList,
        booking_trend: mapSeries(bookingTrendRows),
        revenue_series: {
            daily: mapSeries(revenueDailyRows),
            weekly: mapSeries(revenueWeeklyRows),
            monthly: mapSeries(revenueMonthlyRows)
        },
        recent_activity: recentActivity,
        recent_users: recentUsers,
        recent_facilities: recentFacilities
    })
})
