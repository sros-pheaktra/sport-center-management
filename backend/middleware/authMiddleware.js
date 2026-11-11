
const pool = require('../config/db')

const authenticate = async (req, res, next) => {
    try {
        // Check whether a session exists
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                message: 'Access denied. Please log in.'
            })
        }

        // Get the latest user information from MySQL
        const [users] = await pool.query(
            `SELECT id, full_name, email, role, status
             FROM users
             WHERE id = ?`,
            [req.session.userId]
        )

        if (users.length === 0 || users[0].status !== 'active') {
            req.session.destroy(() => {})

            return res.status(401).json({
                message: 'Account not found or inactive.'
            })
        }

        // Attach current user information to request
        req.user = users[0]

        next()

    } catch (error) {
        console.error('Authentication error:', error.message)

        next(error)
    }
}

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Access denied. Insufficient permissions.'
            })
        }

        next()
    }
}

module.exports = {
    authenticate,
    authorize
}
