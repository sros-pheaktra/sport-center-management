const express = require('express')
const router = express.Router()

const {
    getFacilities,
    getFacilityById,
    createFacility,
    updateFacility,
    updateFacilityStatus
} = require('../controllers/facilityController')

const {
    authenticate,
    authorize
} = require('../middleware/authMiddleware')

// Public: Anyone can view facilities
router.get('/', getFacilities)
router.get('/:id', getFacilityById)

// Admin only: Manage facilities
router.use(authenticate)
router.use(authorize('admin'))

router.post('/', createFacility)
router.put('/:id', updateFacility)
router.patch('/:id/status', updateFacilityStatus)

module.exports = router
