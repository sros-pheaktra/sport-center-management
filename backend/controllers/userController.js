
const bcrypt = require('bcrypt')

const db = require('../config/db')
const asyncHandler = require('../utils/asyncHandler')
const { ROLES } = require('../middleware/authMiddleware')

const SALT_ROUNDS = 10

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d][\d\s()-]{2,29}$/

// The safe user fields returned to clients (never the password hash)
const USER_SELECT = `
    SELECT id, full_name, email, phone, role, is_active, created_at
    FROM users
`

const publicUser = (user) => ({
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    is_active: user.is_active === 1
})

// Validates the shared account fields. Returns { values } or { error }.
const validateAccountFields = ({ full_name, email, phone, password }) => {
    if (!full_name || full_name.length < 2 || full_name.length > 100) {
        return { error: 'Full name must be between 2 and 100 characters' }
    }

    if (!EMAIL_PATTERN.test(email) || email.length > 150) {
        return { error: 'Please enter a valid email address' }
    }

    if (phone && !PHONE_PATTERN.test(phone)) {
        return { error: 'Please enter a valid phone number' }
    }

    if (password !== undefined && password !== null && password !== '') {
        if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
            return { error: 'Password must be between 8 and 72 characters' }
        }
    }

    return {
        values: {
            full_name,
            email,
            phone: phone || null
        }
    }
}

// GET /api/users?search=&role=   (admin, manager)
// Managers see every account except other admins.
exports.listUsers = asyncHandler(async (req, res) => {
    const search = (req.query.search || '').trim()
    const role = (req.query.role || '').trim()

    const conditions = []
    const params = []

    if (req.user.role === 'manager') {
        conditions.push("role != 'admin'")
    }

    if (search) {
        conditions.push('(full_name LIKE ? OR email LIKE ?)')
        params.push(`%${search}%`, `%${search}%`)
    }

    if (role) {
        if (!ROLES.includes(role)) {
            return res.status(400).json({
                message: 'Invalid role filter'
            })
        }

        // Managers cannot list admin accounts at all
        if (req.user.role === 'manager' && role === 'admin') {
            return res.status(403).json({
                message: 'You do not have permission to view admin accounts'
            })
        }

        conditions.push('role = ?')
        params.push(role)
    }

    const whereSql = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : ''

    const [users] = await db.query(
        `${USER_SELECT}
         ${whereSql}
         ORDER BY created_at DESC, id DESC`,
        params
    )

    res.json({
        users: users.map(publicUser)
    })
})

// POST /api/users   (admin: any role · manager: staff only)
exports.createUser = asyncHandler(async (req, res) => {
    const full_name = (req.body.full_name || '').trim()
    const email = (req.body.email || '').trim().toLowerCase()
    const phone = (req.body.phone || '').trim()
    const password = req.body.password || ''
    const role = req.body.role || ''

    // Managers may only create staff accounts (their employees)
    if (req.user.role === 'manager' && role !== 'staff') {
        return res.status(403).json({
            message: 'Managers can only create staff accounts'
        })
    }

    if (!ROLES.includes(role)) {
        return res.status(400).json({
            message: 'Please choose a valid role'
        })
    }

    const validation = validateAccountFields({ full_name, email, phone, password })

    if (validation.error) {
        return res.status(400).json({
            message: validation.error
        })
    }

    // A password is required when creating a new account
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
        return res.status(400).json({
            message: 'Password must be between 8 and 72 characters'
        })
    }

    const [existing] = await db.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
    )

    if (existing.length > 0) {
        return res.status(409).json({
            message: 'An account with this email already exists'
        })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    const [result] = await db.query(
        `INSERT INTO users (full_name, email, password, phone, role)
         VALUES (?, ?, ?, ?, ?)`,
        [full_name, email, passwordHash, phone || null, role]
    )

    const [users] = await db.query(
        `${USER_SELECT} WHERE id = ?`,
        [result.insertId]
    )

    res.status(201).json({
        message: 'Account created successfully',
        user: publicUser(users[0])
    })
})

// PUT /api/users/:id   (admin: any account · manager: staff only)
exports.updateUser = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            message: 'Invalid user id'
        })
    }

    const [existingRows] = await db.query(
        'SELECT id, role, is_active FROM users WHERE id = ?',
        [id]
    )

    if (existingRows.length === 0) {
        return res.status(404).json({
            message: 'User not found. It may have been deleted.'
        })
    }

    const existing = existingRows[0]

    // Managers may only edit staff accounts (their employees)
    if (req.user.role === 'manager' && existing.role !== 'staff') {
        return res.status(403).json({
            message: 'Managers can only edit staff accounts'
        })
    }

    const full_name = (req.body.full_name || '').trim()
    const email = (req.body.email || '').trim().toLowerCase()
    const phone = (req.body.phone || '').trim()
    const password = req.body.password || ''
    const is_active = req.body.is_active

    const validation = validateAccountFields({ full_name, email, phone, password })

    if (validation.error) {
        return res.status(400).json({
            message: validation.error
        })
    }

    // Email uniqueness (ignoring the account being edited)
    const [duplicate] = await db.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
    )

    if (duplicate.length > 0) {
        return res.status(409).json({
            message: 'Another account already uses this email'
        })
    }

    // Only admins may change roles or activate/deactivate accounts
    let role = existing.role
    if (req.body.role !== undefined) {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                message: 'Only admins can change account roles'
            })
        }

        if (!ROLES.includes(req.body.role)) {
            return res.status(400).json({
                message: 'Please choose a valid role'
            })
        }

        role = req.body.role
    }

    let activeValue = existing.is_active
    if (is_active !== undefined) {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                message: 'Only admins can activate or deactivate accounts'
            })
        }

        activeValue = is_active ? 1 : 0
    }

    // Safety: an admin cannot lock themselves out of the system
    if (req.user.role === 'admin' && id === req.user.id) {
        if (role !== 'admin') {
            return res.status(400).json({
                message: 'You cannot remove your own admin role'
            })
        }

        if (!activeValue) {
            return res.status(400).json({
                message: 'You cannot deactivate your own account'
            })
        }
    }

    // Optional password reset — keep the old one when blank
    const updates = [full_name, email, phone || null, role, activeValue]
    let passwordSql = ''

    if (typeof password === 'string' && password !== '') {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
        passwordSql = ', password = ?'
        updates.push(passwordHash)
    }

    updates.push(id)

    await db.query(
        `UPDATE users
         SET full_name = ?, email = ?, phone = ?, role = ?, is_active = ?${passwordSql}
         WHERE id = ?`,
        updates
    )

    const [users] = await db.query(
        `${USER_SELECT} WHERE id = ?`,
        [id]
    )

    res.json({
        message: 'Account updated successfully',
        user: publicUser(users[0])
    })
})

// DELETE /api/users/:id   (admin only)
exports.deleteUser = asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            message: 'Invalid user id'
        })
    }

    if (id === req.user.id) {
        return res.status(400).json({
            message: 'You cannot delete your own account'
        })
    }

    const [existingRows] = await db.query(
        'SELECT id FROM users WHERE id = ?',
        [id]
    )

    if (existingRows.length === 0) {
        return res.status(404).json({
            message: 'User not found. It may have been deleted.'
        })
    }

    await db.query(
        'DELETE FROM users WHERE id = ?',
        [id]
    )

    res.json({
        message: 'Account deleted successfully'
    })
})
