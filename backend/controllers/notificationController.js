
const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')

const NOTIFICATION_FIELDS = `
    SELECT id, type, title, message, link, is_read, created_at
    FROM notifications
`

const unreadCount = async (userId) => {
    const [rows] = await db.query(
        `SELECT COUNT(*) AS count FROM notifications
         WHERE user_id = ? AND is_read = FALSE`,
        [userId]
    )
    return Number(rows[0].count)
}

// GET /api/notifications?unread=1&limit=   (own inbox)
exports.listNotifications = asyncHandler(async (req, res) => {
    const unreadOnly = req.query.unread === '1' || req.query.unread === 'true'
    const requested = Number.parseInt(req.query.limit, 10)
    const limit = Number.isInteger(requested) && requested > 0
        ? Math.min(requested, 100)
        : 50

    const conditions = ['user_id = ?']
    const params = [req.user.id]

    if (unreadOnly) {
        conditions.push('is_read = FALSE')
    }

    const [notifications] = await db.query(
        `${NOTIFICATION_FIELDS}
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
        [...params, limit]
    )

    res.json({
        notifications,
        unread_count: await unreadCount(req.user.id)
    })
})

// POST /api/notifications/:id/read   (own)
exports.markRead = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid notification id' })
    }

    const [result] = await db.query(
        `UPDATE notifications SET is_read = TRUE
         WHERE id = ? AND user_id = ?`,
        [id, req.user.id]
    )

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Notification not found' })
    }

    res.json({
        message: 'Notification marked as read',
        unread_count: await unreadCount(req.user.id)
    })
})

// POST /api/notifications/read-all   (own)
exports.markAllRead = asyncHandler(async (req, res) => {
    await db.query(
        `UPDATE notifications SET is_read = TRUE
         WHERE user_id = ? AND is_read = FALSE`,
        [req.user.id]
    )

    res.json({
        message: 'All notifications marked as read',
        unread_count: 0
    })
})
