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

router.use(authenticate)
router.use(authorize('admin'))

router.get('/', getFacilities)
router.get('/:id', getFacilityById)
router.post('/', createFacility)
router.put('/:id', updateFacility)
router.patch('/:id/status', updateFacilityStatus)

module.exports = router