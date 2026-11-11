
const db = require('../config/db')

// The roles an account can have (mirrors users.role in the DB)
const ROLES = ['admin', 'manager', 'staff', 'customer']

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
            `SELECT id, full_name, email, phone, role, is_active
             FROM users WHERE id = ?`,
            [req.session.userId]
        )

        if (users.length === 0) {
            // The account no longer exists — drop the stale session
            req.session.destroy(() => {})

            return res.status(401).json({
                message: 'Please log in to continue'
            })
        }

        if (!users[0].is_active) {
            // The account was deactivated while logged in
            req.session.destroy(() => {})

            return res.status(403).json({
                message: 'This account has been deactivated. Please contact an administrator.'
            })
        }

        req.user = users[0]

        next()

    } catch (error) {
        next(error)
    }
}

// Role-based access control (RBAC). Usage on a route:
//     router.post('/', authenticate, authorize('admin', 'manager'), handler)
//
// Runs after authenticate, so req.user is always present.
// Sends 403 when the logged-in role is not on the list.
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Please log in to continue'
            })
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'You do not have permission to perform this action'
            })
        }

        next()
    }
}

module.exports = {
    authenticate,
    authorize,
    ROLES
}
