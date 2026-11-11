
const express = require('express')
const router = express.Router()

const {
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController')

const { authenticate, authorize } = require('../middleware/authMiddleware')

// Public: categories for the form dropdown and the browse filter
router.get('/', listCategories)

// Admin/manager: manage categories
router.post('/', authenticate, authorize('admin', 'manager'), createCategory)
router.put('/:id', authenticate, authorize('admin', 'manager'), updateCategory)
router.delete('/:id', authenticate, authorize('admin', 'manager'), deleteCategory)

module.exports = router
