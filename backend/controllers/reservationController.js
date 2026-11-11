
const pool = require('../config/db')
const crypto = require('crypto')

// POST /api/reservations
exports.createReservation = async (req, res) => {
    const connection = await pool.getConnection()

    try {
        const {
            facility_id,
            booking_type = 'reserved',
            start_at,
            end_at,
            number_of_people = 1,
            notes
        } = req.body

        // Validate required fields
        if (!facility_id || !start_at || !end_at) {
            return res.status(400).json({
                success: false,
                message: 'Facility, start time and end time are required'
            })
        }

        if (!['walk-in', 'reserved'].includes(booking_type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking type'
            })
        }

        const people = Number(number_of_people)

        if (!Number.isInteger(people) || people < 1) {
            return res.status(400).json({
                success: false,
                message: 'Number of people must be a positive integer'
            })
        }

        // Validate datetime format and order
        const datePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/

        if (!datePattern.test(start_at) || !datePattern.test(end_at)) {
            return res.status(400).json({
                success: false,
                message: 'Use datetime format YYYY-MM-DD HH:mm:ss'
            })
        }

        const start = new Date(start_at.replace(' ', 'T') + 'Z')
        const end = new Date(end_at.replace(' ', 'T') + 'Z')

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            end <= start
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reservation date or time'
            })
        }

        // Customer can only book for themselves
        const user_id = req.user.id

        await connection.beginTransaction()

        // Lock facility row to prevent concurrent bookings
        const [facilities] = await connection.query(
            `SELECT id, name, capacity, hourly_rate, status
             FROM facilities
             WHERE id = ?
             FOR UPDATE`,
            [facility_id]
        )

        if (facilities.length === 0) {
            await connection.rollback()

            return res.status(404).json({
                success: false,
                message: 'Facility not found'
            })
        }

        const facility = facilities[0]

        if (facility.status !== 'available') {
            await connection.rollback()

            return res.status(400).json({
                success: false,
                message: 'Facility is currently unavailable'
            })
        }

        if (people > facility.capacity) {
            await connection.rollback()

            return res.status(400).json({
                success: false,
                message: `Maximum facility capacity is ${facility.capacity}`
            })
        }

        // Check overlapping reservations
        const [conflicts] = await connection.query(
            `SELECT id
             FROM reservations
             WHERE facility_id = ?
             AND status IN ('pending', 'confirmed', 'checked_in')
             AND start_at < ?
             AND end_at > ?
             LIMIT 1`,
            [facility_id, end_at, start_at]
        )

        if (conflicts.length > 0) {
            await connection.rollback()

            return res.status(409).json({
                success: false,
                message: 'Facility is already reserved during this time'
            })
        }

        // Calculate total amount
        const [calculation] = await connection.query(
            `SELECT ROUND(
                TIMESTAMPDIFF(SECOND, ?, ?) / 3600 * ?,
                2
            ) AS total_amount`,
            [start_at, end_at, facility.hourly_rate]
        )

        const total_amount = calculation[0].total_amount

        // Generate unique reservation code
        const reservation_code =
            'RES-' + Date.now() + '-' +
            crypto.randomBytes(3).toString('hex').toUpperCase()

        // Insert reservation
        const [result] = await connection.query(
            `INSERT INTO reservations (
                reservation_code,
                user_id,
                facility_id,
                booking_type,
                start_at,
                end_at,
                number_of_people,
                total_amount,
                status,
                notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
            [
                reservation_code,
                user_id,
                facility_id,
                booking_type,
                start_at,
                end_at,
                people,
                total_amount,
                notes || null
            ]
        )

        await connection.commit()

        res.status(201).json({
            success: true,
            message: 'Reservation created successfully',
            data: {
                id: result.insertId,
                reservation_code,
                user_id,
                facility_id,
                facility_name: facility.name,
                start_at,
                end_at,
                number_of_people: people,
                total_amount,
                status: 'pending'
            }
        })

    } catch (error) {
        await connection.rollback()

        console.error('Create reservation error:', error)

        res.status(500).json({
            success: false,
            message: 'Failed to create reservation'
        })

    } finally {
        connection.release()
    }
}

exports.getReservations = async (req, res) => {
    try {
        const { status, facility_id } = req.query

        let sql = `
            SELECT
                r.*,
                f.name AS facility_name
            FROM reservations r
            JOIN facilities f ON r.facility_id = f.id
            WHERE 1 = 1
        `

        const params = []

        // Customers can only see their own reservations
        if (req.user.role !== 'admin') {
            sql += ' AND r.user_id = ?'
            params.push(req.user.id)
        }

        if (status) {
            sql += ' AND r.status = ?'
            params.push(status)
        }

        if (facility_id) {
            sql += ' AND r.facility_id = ?'
            params.push(facility_id)
        }

        sql += ' ORDER BY r.created_at DESC'

        const [reservations] = await pool.query(sql, params)

        res.json({
            success: true,
            count: reservations.length,
            data: reservations
        })

    } catch (error) {
        console.error('Get reservations error:', error)

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve reservations'
        })
    }
}

exports.getReservationById = async (req, res) => {
    try {
        const { id } = req.params

        const [reservations] = await pool.query(
            `SELECT
                r.*,
                f.name AS facility_name
             FROM reservations r
             JOIN facilities f ON r.facility_id = f.id
             WHERE r.id = ?`,
            [id]
        )

        if (reservations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            })
        }

        const reservation = reservations[0]

        if (
            req.user.role !== 'admin' &&
            reservation.user_id !== req.user.id
        ) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this reservation'
            })
        }

        res.json({
            success: true,
            data: reservation
        })

    } catch (error) {
        console.error('Get reservation details error:', error)

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve reservation'
        })
    }
}

exports.updateReservation = async (req, res) => {
    const connection = await pool.getConnection()

    try {
        const { id } = req.params

        const {
            facility_id,
            booking_type,
            start_at,
            end_at,
            number_of_people,
            notes
        } = req.body

        await connection.beginTransaction()

        const [reservations] = await connection.query(
            `SELECT *
             FROM reservations
             WHERE id = ?
             FOR UPDATE`,
            [id]
        )

        if (reservations.length === 0) {
            await connection.rollback()

            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            })
        }

        const reservation = reservations[0]

        // Ownership check
        if (
            req.user.role !== 'admin' &&
            reservation.user_id !== req.user.id
        ) {
            await connection.rollback()

            return res.status(403).json({
                success: false,
                message: 'You cannot update this reservation'
            })
        }

        // Customers can only update pending reservations
        if (
            req.user.role !== 'admin' &&
            reservation.status !== 'pending'
        ) {
            await connection.rollback()

            return res.status(400).json({
                success: false,
                message: 'Only pending reservations can be updated'
            })
        }

        const newFacilityId = facility_id ?? reservation.facility_id
        const newBookingType = booking_type ?? reservation.booking_type
        const newStart = start_at ?? reservation.start_at
        const newEnd = end_at ?? reservation.end_at
        const newPeople = Number(
            number_of_people ?? reservation.number_of_people
        )
        const newNotes = notes !== undefined ? notes : reservation.notes

        if (!['walk-in', 'reserved'].includes(newBookingType)) {
            await connection.rollback()

            return res.status(400).json({
                success: false,
                message: 'Invalid booking type'
            })
        }

        if (
            !Number.isInteger(newPeople) ||
            newPeople < 1
        ) {
            await connection.rollback()

            return res.status(400).json({
                success: false,
                message: 'Invalid number of people'
            })
        }

        const datePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/

        const formatDate = value => {
            if (value instanceof Date) {
                return value.toISOString().slice(0, 19).replace('T', ' ')
            }

            return value
        }

        const startValue = formatDate(newStart)
        const endValue = formatDate(newEnd)

        if (
            !datePattern.test(startValue) ||
            !datePattern.test(endValue) ||
            new Date(startValue.replace(' ', 'T') + 'Z') >=
            new Date(endValue.replace(' ', 'T') + 'Z')
        ) {
            await connection.rollback()

            return res.status(400).json({
                success: false,
                message: 'Invalid reservation date or time'
            })
        }

        // Check facility
        const [facilities] = await connection.query(
            `SELECT id, name, capacity, hourly_rate, status
             FROM facilities
             WHERE id = ?
             FOR UPDATE`,
            [newFacilityId]
        )

        if (
            facilities.length === 0 ||
            facilities[0].status !== 'available'
        ) {
            await connection.rollback()

            return res.status(400).json({
                success: false,
                message: 'Facility not found or unavailable'
            })
        }

        const facility = facilities[0]

        if (newPeople > facility.capacity) {
            await connection.rollback()

            return res.status(400).json({
                success: false,
                message: `Maximum facility capacity is ${facility.capacity}`
            })
        }

        // Check overlapping reservations, excluding current reservation
        const [conflicts] = await connection.query(
            `SELECT id
             FROM reservations
             WHERE facility_id = ?
             AND id != ?
             AND status IN ('pending', 'confirmed', 'checked_in')
             AND start_at < ?
             AND end_at > ?
             LIMIT 1`,
            [newFacilityId, id, endValue, startValue]
        )

        if (conflicts.length > 0) {
            await connection.rollback()

            return res.status(409).json({
                success: false,
                message: 'Facility is already reserved during this time'
            })
        }

        // Recalculate price
        const [calculation] = await connection.query(
            `SELECT ROUND(
                TIMESTAMPDIFF(SECOND, ?, ?) / 3600 * ?,
                2
            ) AS total_amount`,
            [startValue, endValue, facility.hourly_rate]
        )

        await connection.query(
            `UPDATE reservations
             SET facility_id = ?,
                 booking_type = ?,
                 start_at = ?,
                 end_at = ?,
                 number_of_people = ?,
                 total_amount = ?,
                 notes = ?
             WHERE id = ?`,
            [
                newFacilityId,
                newBookingType,
                startValue,
                endValue,
                newPeople,
                calculation[0].total_amount,
                newNotes,
                id
            ]
        )

        await connection.commit()

        res.json({
            success: true,
            message: 'Reservation updated successfully'
        })

    } catch (error) {
        await connection.rollback()

        console.error('Update reservation error:', error)

        res.status(500).json({
            success: false,
            message: 'Failed to update reservation'
        })

    } finally {
        connection.release()
    }
}

exports.updateReservationStatus = async (req, res) => {
    try {
        const { id } = req.params
        const { status } = req.body

        const allowedStatuses = [
            'pending',
            'confirmed',
            'checked_in',
            'completed',
            'cancelled',
            'rejected',
            'no_show'
        ]

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reservation status'
            })
        }

        const [reservations] = await pool.query(
            'SELECT * FROM reservations WHERE id = ?',
            [id]
        )

        if (reservations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            })
        }

        const reservation = reservations[0]

        // Customer authorization
        if (req.user.role !== 'admin') {
            if (reservation.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot modify this reservation'
                })
            }

            // Customers can only cancel their own reservations
            if (status !== 'cancelled') {
                return res.status(403).json({
                    success: false,
                    message: 'Customers can only cancel reservations'
                })
            }

            if (!['pending', 'confirmed'].includes(reservation.status)) {
                return res.status(400).json({
                    success: false,
                    message: 'This reservation cannot be cancelled'
                })
            }
        }

        await pool.query(
            `UPDATE reservations
             SET status = ?
             WHERE id = ?`,
            [status, id]
        )

        res.json({
            success: true,
            message: 'Reservation status updated successfully',
            data: {
                id: reservation.id,
                reservation_code: reservation.reservation_code,
                previous_status: reservation.status,
                new_status: status
            }
        })

    } catch (error) {
        console.error('Update reservation status error:', error)

        res.status(500).json({
            success: false,
            message: 'Failed to update reservation status'
        })
    }
}

