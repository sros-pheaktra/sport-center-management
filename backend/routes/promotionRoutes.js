
const express = require('express')
const router = express.Router()

const {
    listPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    validatePromotion
} = require('../controllers/promotionController')

const { authenticate, authorize } = require('../middleware/authMiddleware')

// Customers preview a code from the booking summary.
router.post('/validate', authenticate, validatePromotion)

// Management of the promo codes is a manager/admin task.
router.get('/', authenticate, authorize('admin', 'manager'), listPromotions)
router.post('/', authenticate, authorize('admin', 'manager'), createPromotion)
router.put('/:id', authenticate, authorize('admin', 'manager'), updatePromotion)
router.delete('/:id', authenticate, authorize('admin', 'manager'), deletePromotion)

module.exports = router
