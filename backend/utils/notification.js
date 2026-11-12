
// Small helper for the in-app notification inbox (Phase 4).
// `executor` is either the pool or a transaction connection, so a
// notification can be written atomically with the change that caused it.

const TYPES = ['reservation', 'payment', 'maintenance', 'membership', 'system']

const createNotification = async (executor, {
    userId,
    type = 'system',
    title,
    message,
    link = null
}) => {
    if (!userId || !title || !message) return

    await executor.query(
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES (?, ?, ?, ?, ?)`,
        [
            userId,
            TYPES.includes(type) ? type : 'system',
            String(title).slice(0, 150),
            String(message).slice(0, 500),
            link ? String(link).slice(0, 255) : null
        ]
    )
}

module.exports = {
    createNotification,
    NOTIFICATION_TYPES: TYPES
}
