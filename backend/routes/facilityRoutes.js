
const express = require('express')
const router = express.Router()

const {
    getFacilities,
    getFacilityById,
    createFacility,
    updateFacility,
    deleteFacility
} = require('../controllers/facilityController')

const { authenticate } = require('../middleware/authMiddleware')
const { uploadFacilityImage } = require('../middleware/uploadMiddleware')

// Public: browse, search, filter and view details
router.get('/', getFacilities)
router.get('/:id', getFacilityById)

// Logged in: create (with one optional JPEG/PNG image, max 2 MB)
router.post('/', authenticate, uploadFacilityImage, createFacility)

// Owner only: update (ownership is re-checked on the server)
router.put('/:id', authenticate, uploadFacilityImage, updateFacility)

// Owner only: delete (ownership is re-checked on the server)
router.delete('/:id', authenticate, deleteFacility)

module.exports = router
