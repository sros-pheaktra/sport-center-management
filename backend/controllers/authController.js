
const bcrypt = require('bcrypt')

const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')

// Password hashing method taught in class: bcrypt with a salt
const SALT_ROUNDS = 10

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d][\d\s()-]{2,29}$/

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

// The safe user fields every auth response returns (never the hash)
const publicUser = (user) => ({
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone || null,
    role: user.role
})

// Validates an optional phone number (may be empty/null)
const cleanPhone = (phone) => {
    if (phone === undefined || phone === null) return null
    const trimmed = String(phone).trim()
    return trimmed === '' ? null : trimmed
}

// POST /api/auth/register
// Public sign-up — always creates a CUSTOMER account. Staff,
// manager and admin accounts are created through user management.
exports.register = asyncHandler(async (req, res) => {
    const full_name = (req.body.full_name || '').trim()
    const email = (req.body.email || '').trim().toLowerCase()
    const password = req.body.password || ''
    const confirm_password = req.body.confirm_password || ''
    const phone = cleanPhone(req.body.phone)

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

    if (phone && !PHONE_PATTERN.test(phone)) {
        return res.status(400).json({
            message: 'Please enter a valid phone number'
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
        `INSERT INTO users (full_name, email, password, phone, role)
         VALUES (?, ?, ?, ?, 'customer')`,
        [full_name, email, passwordHash, phone]
    )

    // Log the new user in right away
    await startSession(req, result.insertId)

    res.status(201).json({
        message: 'Account created. Welcome!',
        user: {
            id: result.insertId,
            full_name,
            email,
            phone,
            role: 'customer'
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
        `SELECT id, full_name, email, phone, role, is_active, password
         FROM users WHERE email = ?`,
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

    if (!user.is_active) {
        return res.status(403).json({
            message: 'This account has been deactivated. Please contact an administrator.'
        })
    }

    await startSession(req, user.id)

    res.json({
        message: 'Login successful',
        user: publicUser(user)
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
        `SELECT id, full_name, email, phone, role, is_active
         FROM users WHERE id = ?`,
        [req.session.userId]
    )

    if (users.length === 0 || !users[0].is_active) {
        return res.status(401).json({
            message: 'Not logged in'
        })
    }

    res.json({
        user: publicUser(users[0])
    })
})

// PUT /api/auth/profile  (any logged-in user, own account only)
exports.updateProfile = asyncHandler(async (req, res) => {
    const full_name = (req.body.full_name || '').trim()
    const phone = cleanPhone(req.body.phone)

    if (full_name.length < 2 || full_name.length > 100) {
        return res.status(400).json({
            message: 'Full name must be between 2 and 100 characters'
        })
    }

    if (phone && !PHONE_PATTERN.test(phone)) {
        return res.status(400).json({
            message: 'Please enter a valid phone number'
        })
    }

    await db.query(
        'UPDATE users SET full_name = ?, phone = ? WHERE id = ?',
        [full_name, phone, req.user.id]
    )

    res.json({
        message: 'Profile updated successfully',
        user: { ...publicUser(req.user), full_name, phone }
    })
})

// PUT /api/auth/password  (any logged-in user, own account only)
exports.changePassword = asyncHandler(async (req, res) => {
    const current_password = req.body.current_password || ''
    const new_password = req.body.new_password || ''
    const confirm_password = req.body.confirm_password || ''

    if (!current_password) {
        return res.status(400).json({
            message: 'Your current password is required'
        })
    }

    if (new_password.length < 8 || new_password.length > 72) {
        return res.status(400).json({
            message: 'New password must be between 8 and 72 characters'
        })
    }

    if (new_password !== confirm_password) {
        return res.status(400).json({
            message: 'New passwords do not match'
        })
    }

    const [users] = await db.query(
        'SELECT password FROM users WHERE id = ?',
        [req.user.id]
    )

    const isMatch = await bcrypt.compare(current_password, users[0].password)

    if (!isMatch) {
        return res.status(401).json({
            message: 'Your current password is incorrect'
        })
    }

    const passwordHash = await bcrypt.hash(new_password, SALT_ROUNDS)

    await db.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [passwordHash, req.user.id]
    )

    res.json({
        message: 'Password changed successfully'
    })
})
