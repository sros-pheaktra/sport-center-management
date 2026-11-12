
const express = require('express')
const router = express.Router()

const {
    listSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule
} = require('../controllers/scheduleController')

const { authenticate, authorize } = require('../middleware/authMiddleware')

// Managers see every shift; staff see their own (controller decides)
router.get('/', authenticate, authorize('admin', 'manager', 'staff'), listSchedules)

router.post('/', authenticate, authorize('admin', 'manager'), createSchedule)
router.put('/:id', authenticate, authorize('admin', 'manager'), updateSchedule)
router.delete('/:id', authenticate, authorize('admin', 'manager'), deleteSchedule)

module.exports = router
