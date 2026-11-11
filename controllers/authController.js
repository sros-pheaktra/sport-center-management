
const bcrypt = require('bcrypt')

const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')

// Password hashing method taught in class: bcrypt with a salt
const SALT_ROUNDS = 10

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Creates a fresh session for a user id. Regenerating the session
// id at login prevents session fixation.
const startSession = (req, userId) => new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
        if (err) return reject(err)

        req.session.userId = userId

        req.session.save((saveErr) => {
            if (saveErr) return reject(saveErr)
            resolve()
        })
    })
})

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
    const full_name = (req.body.full_name || '').trim()
    const email = (req.body.email || '').trim().toLowerCase()
    const password = req.body.password || ''
    const confirm_password = req.body.confirm_password || ''

    // Server-side validation
    if (full_name.length < 2 || full_name.length > 100) {
        return res.status(400).json({
            message: 'Full name must be between 2 and 100 characters'
        })
    }

    if (!EMAIL_PATTERN.test(email) || email.length > 150) {
        return res.status(400).json({
            message: 'Please enter a valid email address'
        })
    }

    if (password.length < 8 || password.length > 72) {
        return res.status(400).json({
            message: 'Password must be between 8 and 72 characters'
        })
    }

    if (password !== confirm_password) {
        return res.status(400).json({
            message: 'Passwords do not match'
        })
    }

    // Email addresses are unique
    const [existing] = await db.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
    )

    if (existing.length > 0) {
        return res.status(409).json({
            message: 'An account with this email already exists'
        })
    }

    // Only the bcrypt hash is stored — never the plaintext password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    const [result] = await db.query(
        `INSERT INTO users (full_name, email, password)
         VALUES (?, ?, ?)`,
        [full_name, email, passwordHash]
    )

    // Log the new user in right away
    await startSession(req, result.insertId)

    res.status(201).json({
        message: 'Account created. Welcome!',
        user: {
            id: result.insertId,
            full_name,
            email
        }
    })
})

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase()
    const password = req.body.password || ''

    if (!email || !password) {
        return res.status(400).json({
            message: 'Email and password are required'
        })
    }

    const [users] = await db.query(
        'SELECT id, full_name, email, password FROM users WHERE email = ?',
        [email]
    )

    // Same message for unknown email and wrong password, so we do
    // not reveal which emails exist
    if (users.length === 0) {
        return res.status(401).json({
            message: 'Invalid email or password'
        })
    }

    const user = users[0]

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
        return res.status(401).json({
            message: 'Invalid email or password'
        })
    }

    await startSession(req, user.id)

    res.json({
        message: 'Login successful',
        user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email
        }
    })
})

// POST /api/auth/logout
exports.logout = (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            return next(err)
        }

        res.clearCookie('sportcenter.sid', {
            httpOnly: true,
            sameSite: 'lax',
            path: '/'
        })

        res.json({
            message: 'Logout successful'
        })
    })
}

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            message: 'Not logged in'
        })
    }

    const [users] = await db.query(
        'SELECT id, full_name, email FROM users WHERE id = ?',
        [req.session.userId]
    )

    if (users.length === 0) {
        return res.status(401).json({
            message: 'Not logged in'
        })
    }

    res.json({
        user: users[0]
    })
})
