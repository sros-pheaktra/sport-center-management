
const express = require('express')
const router = express.Router()

const {
    listNotifications,
    markRead,
    markAllRead
} = require('../controllers/notificationController')

const { authenticate } = require('../middleware/authMiddleware')

// Every role has a personal inbox.
router.get('/', authenticate, listNotifications)
router.post('/read-all', authenticate, markAllRead)
router.post('/:id/read', authenticate, markRead)

module.exports = router
