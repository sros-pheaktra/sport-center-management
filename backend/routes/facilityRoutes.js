
const express = require('express')
const router = express.Router()

const {
    getFacilities,
    getFacilityById,
    getFacilityAvailability,
    createFacility,
    updateFacility,
    deleteFacility
} = require('../controllers/facilityController')

const {
    listFacilityReviews,
    createReview
} = require('../controllers/reviewController')

const { authenticate, authorize } = require('../middleware/authMiddleware')
const { uploadFacilityImage } = require('../middleware/uploadMiddleware')

// Public: browse, search, filter and view details
router.get('/', getFacilities)

// Public: hourly availability grid for one day (Phase 2)
router.get('/:id/availability', getFacilityAvailability)

// Public: reviews + rating summary (Phase 4); customers write reviews
// after a completed booking at the facility.
router.get('/:id/reviews', listFacilityReviews)
router.post('/:id/reviews', authenticate, authorize('customer'), createReview)

router.get('/:id', getFacilityById)

// Admin/manager/staff: create (with one optional JPEG/PNG image, max 2 MB)
router.post('/', authenticate, authorize('admin', 'manager', 'staff'), uploadFacilityImage, createFacility)

// Admin/manager/staff: update (role is re-checked on the server)
router.put('/:id', authenticate, authorize('admin', 'manager', 'staff'), uploadFacilityImage, updateFacility)

// Admin/manager/staff: delete (role is re-checked on the server)
router.delete('/:id', authenticate, authorize('admin', 'manager', 'staff'), deleteFacility)

module.exports = router
