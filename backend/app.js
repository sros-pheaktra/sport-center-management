
require('dotenv').config({ path: '../.env' })

const express = require('express')
const app = express()

const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
const facilityRoutes = require('./routes/facilityRoutes')
const reservationRoutes = require('./routes/reservationRoutes')
const {
    authenticate,
    authorize
} = require('./middleware/authMiddleware')

const PORT = process.env.PORT || 5000

app.use(express.json())

// Home
app.get('/', (req, res) => {
    res.send('Sport Center Management API')
})

// Authentication
app.use('/api/auth', authRoutes)

// Test protected route
app.get('/api/admin/test',
    authenticate,
    authorize('admin'),
    (req, res) => {
        res.json({
            message: 'Welcome, Administrator!',
            user: req.user
        })
    }
)

// User Management
app.use('/api/users', userRoutes)

// Facility Management
app.use('/api/facilities', facilityRoutes)

// Reservation Managment
app.use('/api/reservations', reservationRoutes)

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
})
