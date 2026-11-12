
const express = require('express')
const router = express.Router()

const {
    listRequests,
    createRequest,
    updateRequest
} = require('../controllers/maintenanceController')

const { authenticate, authorize } = require('../middleware/authMiddleware')

const STAFF = ['admin', 'manager', 'staff']

router.get('/', authenticate, authorize(...STAFF), listRequests)
router.post('/', authenticate, authorize(...STAFF), createRequest)

// Staff can move work to in_progress; the controller restricts
// resolved/closed to managers and admins.
router.put('/:id', authenticate, authorize(...STAFF), updateRequest)

module.exports = router
