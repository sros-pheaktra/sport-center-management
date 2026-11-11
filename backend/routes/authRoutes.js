
const express = require('express')
const router = express.Router()

const {
    register,
    login,
    logout,
    getMe,
    updateProfile,
    changePassword
} = require('../controllers/authController')

const { authenticate } = require('../middleware/authMiddleware')

// Public routes
router.post('/register', register)
router.post('/login', login)

// Needs an active session
router.post('/logout', logout)

// Current logged-in user (401 when nobody is logged in)
router.get('/me', getMe)

// Own-account management (any role)
router.put('/profile', authenticate, updateProfile)
router.put('/password', authenticate, changePassword)

module.exports = router
