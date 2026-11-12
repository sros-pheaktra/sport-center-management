
const express = require('express')
const router = express.Router()

const {
    listReviews,
    deleteReview
} = require('../controllers/reviewController')

const { authenticate, authorize } = require('../middleware/authMiddleware')

// Staff-side moderation list; deleting a review is a manager decision.
router.get('/', authenticate, authorize('admin', 'manager', 'staff'), listReviews)
router.delete('/:id', authenticate, authorize('admin', 'manager'), deleteReview)

module.exports = router
