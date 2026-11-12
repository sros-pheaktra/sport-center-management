
const express = require('express')
const router = express.Router()

const {
    listAttendance,
    getMyToday,
    clockIn,
    clockOut
} = require('../controllers/attendanceController')

const { authenticate, authorize } = require('../middleware/authMiddleware')

const STAFF = ['admin', 'manager', 'staff']

router.get('/', authenticate, authorize(...STAFF), listAttendance)
router.get('/today', authenticate, authorize(...STAFF), getMyToday)

router.post('/clock-in', authenticate, authorize(...STAFF), clockIn)
router.post('/clock-out', authenticate, authorize(...STAFF), clockOut)

module.exports = router
