
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')

const sessionMiddleware = require('./config/session')

const authRoutes = require('./routes/authRoutes')
const facilityRoutes = require('./routes/facilityRoutes')
const categoryRoutes = require('./routes/categoryRoutes')
const userRoutes = require('./routes/userRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes')
const reservationRoutes = require('./routes/reservationRoutes')
const paymentRoutes = require('./routes/paymentRoutes')

// Phase 3–5 routers are intentionally NOT mounted in this delivery.
// Scope is Phase 1 (core foundation) + Phase 2 (bookings, payments,
// check-in). Their route/controller files, utilities and database tables
// remain in the repository so the features can be re-enabled later.
//
const invoiceRoutes = require('./routes/invoiceRoutes')
// const membershipPlanRoutes = require('./routes/membershipPlanRoutes')
// const membershipRoutes = require('./routes/membershipRoutes')
// const scheduleRoutes = require('./routes/scheduleRoutes')
// const attendanceRoutes = require('./routes/attendanceRoutes')
const maintenanceRoutes = require('./routes/maintenanceRoutes')
// const notificationRoutes = require('./routes/notificationRoutes')
// const equipmentRoutes = require('./routes/equipmentRoutes')
// const rentalRoutes = require('./routes/rentalRoutes')
// const promotionRoutes = require('./routes/promotionRoutes')
// const reviewRoutes = require('./routes/reviewRoutes')

const app = express()
const PORT = process.env.PORT || 5001

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Session-based login (default in-memory store, as taught in class)
app.use(sessionMiddleware)

// Uploaded facility images (multer writes here)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Home
app.get('/', (req, res) => {
    res.json({
        message: 'Sport Center Management API',
        docs: {
            facilities: '/api/facilities',
            categories: '/api/categories',
            users: '/api/users (admin/manager)',
            dashboard: '/api/dashboard/stats (admin/manager/staff)'
        }
    })
})

// Authentication (registration, login, logout, current user, own profile)
app.use('/api/auth', authRoutes)

// Facilities (main resource)
app.use('/api/facilities', facilityRoutes)

// Categories (used by the facility forms and filters)
app.use('/api/categories', categoryRoutes)

// User & staff management (admin/manager)
app.use('/api/users', userRoutes)

// Dashboard statistics (admin/manager/staff)
app.use('/api/dashboard', dashboardRoutes)

// Bookings & availability (Phase 2)
app.use('/api/reservations', reservationRoutes)

// Payments are part of the retained Phase 2 booking lifecycle
app.use('/api/payments', paymentRoutes)

// Phase 3–5 routes (/invoices, /membership-plans, /memberships, /schedules,
// /attendance, /maintenance, /notifications, /equipment, /rentals,
// /promotions, /reviews) are not mounted — see the commented block above.
// Requests to them fall through to the 404 handler below.

// Unknown routes
app.use((req, res) => {
    res.status(404).json({
        message: 'Not found'
    })
})

// Global Error Handler
// Logs the full error server-side, but only sends a short generic
// message to the client — never passwords, DB credentials or stack traces.
app.use((err, req, res, next) => {
    console.error(err)

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            message: 'Invalid request body'
        })
    }

    res.status(500).json({
        message: 'Internal server error'
    })
})

// Start Server
app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`)
})
