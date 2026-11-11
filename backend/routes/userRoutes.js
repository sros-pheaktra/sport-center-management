
const express = require('express')
const router = express.Router()

const {
    authenticate,
    authorize
} = require('../middleware/authMiddleware')

const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    updateUserStatus,
    updateUserRole
} = require('../controllers/userController')

// All routes require admin access
router.use(authenticate, authorize('admin'))

router.get('/', getAllUsers)
router.get('/:id', getUserById)
router.post('/', createUser)
router.put('/:id', updateUser)
router.patch('/:id/status', updateUserStatus)
router.patch('/:id/role', updateUserRole)

module.exports = router
