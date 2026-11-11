
const express = require('express')
const router = express.Router()

const { listCategories } = require('../controllers/categoryController')

// Public: categories for the form dropdown and the browse filter
router.get('/', listCategories)

module.exports = router
