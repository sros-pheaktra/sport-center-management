
const express = require('express')
const router = express.Router()

const {
    listPayments,
    getPayment,
    recordPayment,
    refundPayment
} = require('../controllers/paymentController')

const { authenticate, authorize } = require('../middleware/authMiddleware')

const STAFF = ['admin', 'manager', 'staff']

// Staff-side: payments overview and detail
router.get('/', authenticate, authorize(...STAFF), listPayments)
router.get('/:id', authenticate, authorize(...STAFF), getPayment)

// Record an at-center payment
router.post('/:id/record', authenticate, authorize(...STAFF), recordPayment)

// Refunds are a manager/admin decision
router.post('/:id/refund', authenticate, authorize('admin', 'manager'), refundPayment)

module.exports = router
