const express = require('express')
const router = express.Router()

const {
    login,
    getMe,
    logout
} = require('../controllers/authController')

const { authenticate } = require('../middleware/authMiddleware')

// Public route
router.post('/login', login)

// Protected routes
router.get('/me', authenticate, getMe)
router.post('/logout', authenticate, logout)

module.exports = router