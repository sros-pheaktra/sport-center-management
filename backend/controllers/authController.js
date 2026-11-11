
const pool = require('../config/db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            })
        }

        const [users] = await pool.query(
            `SELECT id, full_name, email, password, role, status
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

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '1d'
            }
        )

        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
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
            [req.user.id]
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
exports.logout = (req, res) => {
    return res.status(200).json({
        message: 'Logout successful. Please remove your token.'
    })
}
