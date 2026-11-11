const pool = require('../config/db')
const bcrypt = require('bcryptjs')

// POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            })
        }

        const [users] = await pool.query(
            `SELECT id, full_name, email, password, phone, role, status
             FROM users
             WHERE email = ?`,
            [email.trim().toLowerCase()]
        )

        if (users.length === 0) {
            return res.status(401).json({
                message: 'Invalid email or password'
            })
        }

        const user = users[0]

        if (user.status !== 'active') {
            return res.status(403).json({
                message: 'Your account is not active'
            })
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        )

        if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid email or password'
            })
        }

        // Regenerate session to prevent session fixation
        req.session.regenerate((err) => {
            if (err) {
                return next(err)
            }

            // Store user ID in session
            req.session.userId = user.id

            req.session.save((err) => {
                if (err) {
                    return next(err)
                }

                return res.status(200).json({
                    message: 'Login successful',
                    user: {
                        id: user.id,
                        full_name: user.full_name,
                        email: user.email,
                        phone: user.phone,
                        role: user.role
                    }
                })
            })
        })

    } catch (error) {
        console.error('Login error:', error.message)
        return res.status(500).json({
            message: 'Internal server error'
        })
    }
}

// GET /api/auth/me
exports.getMe = async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT id, full_name, email, phone, role, status
             FROM users
             WHERE id = ?`,
            [req.session.userId]
        )

        if (users.length === 0) {
            return res.status(404).json({
                message: 'User not found'
            })
        }

        if (users[0].status !== 'active') {
            return res.status(403).json({
                message: 'Your account is not active'
            })
        }

        return res.status(200).json({
            user: users[0]
        })

    } catch (error) {
        console.error('Get profile error:', error.message)

        return res.status(500).json({
            message: 'Internal server error'
        })
    }
}

// POST /api/auth/logout
exports.logout = (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            return next(err)
        }

        res.clearCookie('sportcenter.sid', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        })

        return res.status(200).json({
            message: 'Logout successful'
        })
    })
}
