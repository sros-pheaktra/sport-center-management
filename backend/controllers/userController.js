const pool = require('../config/db')
const bcrypt = require('bcryptjs')

// GET /api/users
exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT id, full_name, email, phone, role,
                   gender, status, created_at
            FROM users
            ORDER BY created_at DESC
        `)

        res.status(200).json({
            count: users.length,
            users
        })
    } catch (error) {
        console.error(error.message)
        res.status(500).json({ message: 'Failed to retrieve users' })
    }
}

// GET /api/users/:id
exports.getUserById = async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT id, full_name, email, phone, role,
                    gender, status, created_at
             FROM users WHERE id = ?`,
            [req.params.id]
        )

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' })
        }

        res.status(200).json({ user: users[0] })
    } catch (error) {
        console.error(error.message)
        res.status(500).json({ message: 'Failed to retrieve user' })
    }
}

// POST /api/users
exports.createUser = async (req, res) => {
    try {
        const {
            full_name,
            email,
            phone,
            password,
            gender,
            role
        } = req.body

        if (!full_name || !email || !password) {
            return res.status(400).json({
                message: 'Full name, email and password are required'
            })
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: 'Password must contain at least 8 characters'
            })
        }

        const allowedRoles = ['admin', 'staff', 'customer']
        const allowedGenders = ['male', 'female', 'other']

        const userRole = role || 'customer'

        if (!allowedRoles.includes(userRole)) {
            return res.status(400).json({ message: 'Invalid role' })
        }

        if (gender && !allowedGenders.includes(gender)) {
            return res.status(400).json({ message: 'Invalid gender' })
        }

        const normalizedEmail = email.trim().toLowerCase()

        const hashedPassword = await bcrypt.hash(password, 12)

        const [result] = await pool.query(
            `INSERT INTO users
             (full_name, email, phone, password, gender, role, status)
             VALUES (?, ?, ?, ?, ?, ?, 'active')`,
            [
                full_name.trim(),
                normalizedEmail,
                phone || null,
                hashedPassword,
                gender || null,
                userRole
            ]
        )

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: result.insertId,
                full_name: full_name.trim(),
                email: normalizedEmail,
                role: userRole,
                status: 'active'
            }
        })

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'Email or phone number already exists'
            })
        }

        console.error(error.message)
        res.status(500).json({ message: 'Failed to create user' })
    }
}

// PUT /api/users/:id
exports.updateUser = async (req, res) => {
    try {
        const { full_name, email, phone, gender } = req.body

        const fields = []
        const values = []

        if (full_name !== undefined) {
            if (!full_name.trim()) {
                return res.status(400).json({
                    message: 'Full name cannot be empty'
                })
            }
            fields.push('full_name = ?')
            values.push(full_name.trim())
        }

        if (email !== undefined) {
            if (!email.trim()) {
                return res.status(400).json({
                    message: 'Email cannot be empty'
                })
            }
            fields.push('email = ?')
            values.push(email.trim().toLowerCase())
        }

        if (phone !== undefined) {
            fields.push('phone = ?')
            values.push(phone || null)
        }

        if (gender !== undefined) {
            if (gender !== null &&
                !['male', 'female', 'other'].includes(gender)) {
                return res.status(400).json({
                    message: 'Invalid gender'
                })
            }
            fields.push('gender = ?')
            values.push(gender)
        }

        if (fields.length === 0) {
            return res.status(400).json({
                message: 'No fields provided for update'
            })
        }

        values.push(req.params.id)

        const [result] = await pool.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' })
        }

        res.status(200).json({
            message: 'User updated successfully'
        })

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'Email or phone number already exists'
            })
        }

        console.error(error.message)
        res.status(500).json({ message: 'Failed to update user' })
    }
}

// PATCH /api/users/:id/status
exports.updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body

        if (!['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({
                message: 'Invalid account status'
            })
        }

        if (String(req.params.id) === String(req.user.id)) {
            return res.status(400).json({
                message: 'You cannot change your own account status'
            })
        }

        const [result] = await pool.query(
            'UPDATE users SET status = ? WHERE id = ?',
            [status, req.params.id]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' })
        }

        res.status(200).json({
            message: `User status changed to ${status}`
        })

    } catch (error) {
        console.error(error.message)
        res.status(500).json({ message: 'Failed to update status' })
    }
}

// PATCH /api/users/:id/role
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body

        if (!['admin', 'staff', 'customer'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' })
        }

        if (String(req.params.id) === String(req.user.id)) {
            return res.status(400).json({
                message: 'You cannot change your own role'
            })
        }

        const [result] = await pool.query(
            'UPDATE users SET role = ? WHERE id = ?',
            [role, req.params.id]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' })
        }

        res.status(200).json({
            message: `User role changed to ${role}`
        })

    } catch (error) {
        console.error(error.message)
        res.status(500).json({ message: 'Failed to update role' })
    }
}
