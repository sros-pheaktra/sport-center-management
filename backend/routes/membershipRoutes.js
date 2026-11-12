
const express = require('express')
const router = express.Router()

const {
    getMyMembership,
    listMemberships,
    createMembership,
    cancelMembership
} = require('../controllers/membershipController')

const { authenticate, authorize } = require('../middleware/authMiddleware')

// Current active membership (booking summary + memberships page)
router.get('/mine', authenticate, getMyMembership)

// Staff-side sees all; customers only ever see their own.
router.get('/', authenticate, listMemberships)

// Customers subscribe to a plan
router.post('/', authenticate, authorize('customer'), createMembership)

// Managers can cancel an active membership
router.post('/:id/cancel', authenticate, authorize('admin', 'manager'), cancelMembership)

module.exports = router
