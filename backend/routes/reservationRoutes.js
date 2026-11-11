
const express = require('express')
const router = express.Router()

const { authenticate } = require('../middleware/authMiddleware')

const {
    createReservation,
    getReservations,
    getReservationById,
    updateReservation,
    updateReservationStatus
} = require('../controllers/reservationController')

router.use(authenticate)

// Reservation CRUD
router.get('/', getReservations)
router.get('/:id', getReservationById)
router.post('/', createReservation)
router.put('/:id', updateReservation)

// Reservation status
router.patch('/:id/status', updateReservationStatus)

module.exports = router
