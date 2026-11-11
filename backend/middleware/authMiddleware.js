
const jwt = require('jsonwebtoken')
const pool = require('../config/db')

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Access denied. No token provided.'
            })
        }

        const token = authHeader.split(' ')[1]

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        )

        const [users] = await pool.query(
            `SELECT id, full_name, email, role, status
             FROM users
             WHERE id = ?`,
            [decoded.id]
        )

        if (users.length === 0 || users[0].status !== 'active') {
            return res.status(401).json({
                message: 'Account not found or inactive'
            })
        }

        // Use current database role, not an old JWT role
        req.user = users[0]

        next()

    } catch (error) {
        if (error.name === 'JsonWebTokenError' ||
            error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Invalid or expired token'
            })
        }

        console.error('Authentication error:', error.message)

        return res.status(500).json({
            message: 'Authentication failed'
        })
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
