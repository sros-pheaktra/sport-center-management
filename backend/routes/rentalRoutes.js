
const express = require('express')
const router = express.Router()

const {
    listRentals,
    returnRental
} = require('../controllers/equipmentController')

const { authenticate, authorize } = require('../middleware/authMiddleware')

// Staff-side sees every rental; customers only ever see their own.
router.get('/', authenticate, listRentals)

// Returning an item happens at the front desk.
router.post('/:id/return', authenticate, authorize('admin', 'manager', 'staff'), returnRental)

module.exports = router
