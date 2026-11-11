
const db = require('../config/db')

// Checks that the request has a valid session and attaches the
// current user (fresh from the database) to req.user.
const authenticate = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                message: 'Please log in to continue'
            })
        }

        const [users] = await db.query(
            'SELECT id, full_name, email FROM users WHERE id = ?',
            [req.session.userId]
        )

        if (users.length === 0) {
            // The account no longer exists — drop the stale session
            req.session.destroy(() => {})

            return res.status(401).json({
                message: 'Please log in to continue'
            })
        }

        req.user = users[0]

        next()

    } catch (error) {
        next(error)
    }
}

module.exports = {
    authenticate
}
