
const express = require('express')
const router = express.Router()

const { getStats } = require('../controllers/dashboardController')
const { authenticate, authorize } = require('../middleware/authMiddleware')

// Dashboard numbers for admin / manager / staff
router.get('/stats', authenticate, authorize('admin', 'manager', 'staff'), getStats)

module.exports = router
