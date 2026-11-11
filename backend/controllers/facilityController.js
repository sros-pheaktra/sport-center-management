
const db = require('../config/db');

// GET /api/facilities
// Get all facilities
exports.getFacilities = async (req, res) => {
    try {
        const [facilities] = await db.query(`
            SELECT f.*, s.name AS sport_name
            FROM facilities f
            LEFT JOIN sports s ON f.sport_id = s.id
            ORDER BY f.id DESC
        `);

        res.status(200).json({
            success: true,
            count: facilities.length,
            data: facilities
        });

    } catch (error) {
        console.error('Get facilities error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve facilities'
        });
    }
};


// GET /api/facilities/:id
// Get one facility
exports.getFacilityById = async (req, res) => {
    try {
        const { id } = req.params;

        const [facilities] = await db.query(`
            SELECT f.*, s.name AS sport_name
            FROM facilities f
            LEFT JOIN sports s ON f.sport_id = s.id
            WHERE f.id = ?
        `, [id]);

        if (facilities.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Facility not found'
            });
        }

        res.status(200).json({
            success: true,
            data: facilities[0]
        });

    } catch (error) {
        console.error('Get facility error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve facility'
        });
    }
};


// POST /api/facilities
// Create facility
exports.createFacility = async (req, res) => {
    try {
        const {
            sport_id,
            name,
            description,
            location,
            facility_type,
            capacity,
            hourly_rate
        } = req.body;

        if (!name || !facility_type || hourly_rate === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Name, facility type and hourly rate are required'
            });
        }

        if (!['indoor', 'outdoor'].includes(facility_type)) {
            return res.status(400).json({
                success: false,
                message: 'Facility type must be indoor or outdoor'
            });
        }

        if (!Number.isFinite(Number(hourly_rate)) || Number(hourly_rate) < 0) {
            return res.status(400).json({
                success: false,
                message: 'Hourly rate must be a non-negative number'
            });
        }

        if (capacity !== undefined &&
            (!Number.isInteger(Number(capacity)) || Number(capacity) < 1)) {
            return res.status(400).json({
                success: false,
                message: 'Capacity must be a positive integer'
            });
        }

        const [result] = await db.query(
            `INSERT INTO facilities
            (sport_id, name, description, location, facility_type, capacity, hourly_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                sport_id || null,
                name.trim(),
                description || null,
                location || null,
                facility_type,
                capacity ?? 1,
                hourly_rate
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Facility created successfully',
            data: {
                id: result.insertId,
                name,
                facility_type,
                hourly_rate
            }
        });

    } catch (error) {
        console.error('Create facility error:', error);

        res.status(error.code === 'ER_NO_REFERENCED_ROW_2' ? 400 : 500).json({
            success: false,
            message: error.code === 'ER_NO_REFERENCED_ROW_2'
                ? 'Invalid sport ID'
                : 'Failed to create facility'
        });
    }
};


// PUT /api/facilities/:id
// Update facility
exports.updateFacility = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            sport_id,
            name,
            description,
            location,
            facility_type,
            capacity,
            hourly_rate
        } = req.body;

        if (!name || !facility_type || hourly_rate === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Name, facility type and hourly rate are required'
            });
        }

        if (!['indoor', 'outdoor'].includes(facility_type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid facility type'
            });
        }

        if (!Number.isFinite(Number(hourly_rate)) || Number(hourly_rate) < 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid hourly rate'
            });
        }

        if (capacity !== undefined &&
            (!Number.isInteger(Number(capacity)) || Number(capacity) < 1)) {
            return res.status(400).json({
                success: false,
                message: 'Capacity must be a positive integer'
            });
        }

        const [result] = await db.query(
            `UPDATE facilities SET
                sport_id = ?,
                name = ?,
                description = ?,
                location = ?,
                facility_type = ?,
                capacity = ?,
                hourly_rate = ?
            WHERE id = ?`,
            [
                sport_id || null,
                name.trim(),
                description || null,
                location || null,
                facility_type,
                capacity ?? 1,
                hourly_rate,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Facility not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Facility updated successfully'
        });

    } catch (error) {
        console.error('Update facility error:', error);

        res.status(error.code === 'ER_NO_REFERENCED_ROW_2' ? 400 : 500).json({
            success: false,
            message: error.code === 'ER_NO_REFERENCED_ROW_2'
                ? 'Invalid sport ID'
                : 'Failed to update facility'
        });
    }
};


// PATCH /api/facilities/:id/status
// Change facility status
exports.updateFacilityStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowedStatuses = [
            'available',
            'unavailable',
            'maintenance'
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be available, unavailable or maintenance'
            });
        }

        const [result] = await db.query(
            'UPDATE facilities SET status = ? WHERE id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Facility not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Facility status updated successfully',
            data: { id, status }
        });

    } catch (error) {
        console.error('Update facility status error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to update facility status'
        });
    }
};
