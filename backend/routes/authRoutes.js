
const express = require('express')
const router = express.Router()

const {
    register,
    login,
    logout,
    getMe
} = require('../controllers/authController')

// Public routes
router.post('/register', register)
router.post('/login', login)

// Needs an active session
router.post('/logout', logout)

// Current logged-in user (401 when nobody is logged in)
router.get('/me', getMe)

module.exports = router
