
require('dotenv').config({ path: '../.env' })

const express = require('express')
const cors = require('cors')
const app = express()

const sessionMiddleware = require('./config/session')

const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
const facilityRoutes = require('./routes/facilityRoutes')
const reservationRoutes = require('./routes/reservationRoutes')

const {
    authenticate,
    authorize
} = require('./middleware/authMiddleware')

const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Session
app.use(sessionMiddleware)

// Home
app.get('/', (req, res) => {
    res.send('Sport Center Management API')
})

// Authentication
app.use('/api/auth', authRoutes)

// Test protected route
app.get(
    '/api/admin/test',
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

// Reservation Management
app.use('/api/reservations', reservationRoutes)

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
})

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err)

    res.status(500).json({
        message: 'Internal Server Error'
    })
})