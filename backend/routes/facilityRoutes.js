
const express = require('express')
const router = express.Router()

const {
    getFacilities,
    getFacilityById,
    createFacility,
    updateFacility,
    deleteFacility
} = require('../controllers/facilityController')

const { authenticate, authorize } = require('../middleware/authMiddleware')
const { uploadFacilityImage } = require('../middleware/uploadMiddleware')

// Public: browse, search, filter and view details
router.get('/', getFacilities)
router.get('/:id', getFacilityById)

// Admin/manager: create (with one optional JPEG/PNG image, max 2 MB)
router.post('/', authenticate, authorize('admin', 'manager'), uploadFacilityImage, createFacility)

// Admin/manager: update (role is re-checked on the server)
router.put('/:id', authenticate, authorize('admin', 'manager'), uploadFacilityImage, updateFacility)

// Admin/manager: delete (role is re-checked on the server)
router.delete('/:id', authenticate, authorize('admin', 'manager'), deleteFacility)

module.exports = router
