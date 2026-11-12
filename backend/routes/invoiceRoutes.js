
const express = require('express')
const router = express.Router()

const {
    listInvoices,
    getInvoice
} = require('../controllers/invoiceController')

const { authenticate } = require('../middleware/authMiddleware')

// Customers see their own invoices; staff-side roles see all.
router.get('/', authenticate, listInvoices)
router.get('/:id', authenticate, getInvoice)

module.exports = router
