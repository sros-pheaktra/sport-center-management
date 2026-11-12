
const express = require('express')
const router = express.Router()

const {
    listReservations,
    getReservation,
    createReservation,
    cancelReservation,
    confirmReservation,
    checkInReservation,
    checkInByCode,
    completeReservation,
    markNoShow,
    payReservation
} = require('../controllers/reservationController')

const { authenticate, authorize } = require('../middleware/authMiddleware')

// Any logged-in user: list their own bookings; staff-side roles see
// all bookings (the controller decides based on the role).
router.get('/', authenticate, listReservations)

// Any logged-in user: book a facility for themselves.
router.post('/', authenticate, createReservation)

// Staff+: front-desk check-in by the code on the customer's
// confirmation. Must be declared before the /:reference route.
router.post(
    '/check-in/:code',
    authenticate,
    authorize('admin', 'manager', 'staff'),
    checkInByCode
)

// Owner or staff+: booking detail (looked up by reference).
router.get('/:reference', authenticate, getReservation)

// Owner before start / staff+ any time.
router.post('/:id/cancel', authenticate, cancelReservation)

// Owner: simulated online payment.
router.post('/:id/pay', authenticate, payReservation)

// Staff-side lifecycle actions.
router.post('/:id/confirm', authenticate, authorize('admin', 'manager', 'staff'), confirmReservation)
router.post('/:id/check-in', authenticate, authorize('admin', 'manager', 'staff'), checkInReservation)
router.post('/:id/complete', authenticate, authorize('admin', 'manager', 'staff'), completeReservation)
router.post('/:id/no-show', authenticate, authorize('admin', 'manager', 'staff'), markNoShow)

module.exports = router
