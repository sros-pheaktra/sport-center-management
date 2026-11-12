
// Membership helpers shared by bookings, memberships and stats.

// Memberships are not expired by a scheduler, so read paths lazily
// close any membership whose end date has passed.
const expireMemberships = async (db) => {
    await db.query(
        `UPDATE memberships
         SET status = 'expired'
         WHERE status = 'active' AND ends_on < CURDATE()`
    )
}

// The customer's active membership and plan, or null. `db` can be
// the pool or a transaction connection.
const getActiveMembership = async (db, userId) => {
    const [rows] = await db.query(
        `SELECT
            m.id,
            m.user_id,
            m.starts_on,
            m.ends_on,
            m.status,
            p.id AS plan_id,
            p.name AS plan_name,
            p.price AS plan_price,
            p.booking_discount_percent
         FROM memberships m
         JOIN membership_plans p ON m.plan_id = p.id
         WHERE m.user_id = ?
           AND m.status = 'active'
           AND m.starts_on <= CURDATE()
           AND m.ends_on >= CURDATE()
         ORDER BY p.booking_discount_percent DESC, m.id DESC
         LIMIT 1`,
        [userId]
    )

    return rows[0] || null
}

module.exports = { expireMemberships, getActiveMembership }
