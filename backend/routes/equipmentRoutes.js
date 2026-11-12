
const express = require('express')
const router = express.Router()

const {
    listEquipment,
    getEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    rentEquipment
} = require('../controllers/equipmentController')

const { authenticate, authorize } = require('../middleware/authMiddleware')

// The catalogue is public marketing content; browsing never needs a login.
router.get('/', listEquipment)
router.get('/:id', getEquipment)

// Customers rent for themselves (optionally linked to a booking).
router.post('/:id/rent', authenticate, authorize('customer'), rentEquipment)

// Managers/admins manage the catalogue.
router.post('/', authenticate, authorize('admin', 'manager'), createEquipment)
router.put('/:id', authenticate, authorize('admin', 'manager'), updateEquipment)
router.delete('/:id', authenticate, authorize('admin', 'manager'), deleteEquipment)

module.exports = router
