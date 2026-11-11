
const express = require('express')
const router = express.Router()

const {
    listUsers,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/userController')

const { authenticate, authorize } = require('../middleware/authMiddleware')

// User & staff management (admin: any account, manager: staff only)
router.get('/', authenticate, authorize('admin', 'manager'), listUsers)
router.post('/', authenticate, authorize('admin', 'manager'), createUser)
router.put('/:id', authenticate, authorize('admin', 'manager'), updateUser)
router.delete('/:id', authenticate, authorize('admin'), deleteUser)

module.exports = router
