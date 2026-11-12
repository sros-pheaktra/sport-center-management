
const express = require('express')
const router = express.Router()

const {
    listPlans,
    createPlan,
    updatePlan,
    deletePlan
} = require('../controllers/membershipController')

const { authenticate, authorize } = require('../middleware/authMiddleware')

// Plans are public marketing information
router.get('/', listPlans)

router.post('/', authenticate, authorize('admin', 'manager'), createPlan)
router.put('/:id', authenticate, authorize('admin', 'manager'), updatePlan)
router.delete('/:id', authenticate, authorize('admin', 'manager'), deletePlan)

module.exports = router
