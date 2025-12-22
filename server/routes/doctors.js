import express from 'express';
import { query, queryOne, insert, update, remove } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Generate doctor code
async function generateDoctorCode() {
    const result = await queryOne('SELECT COUNT(*) as count FROM doctors');
    const count = result.count + 1;
    return `DOC${String(count).padStart(5, '0')}`;
}

// Get all doctors
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, active_only } = req.query;
        
        let sql = 'SELECT * FROM doctors';
        const params = [];
        const conditions = [];

        if (search) {
            conditions.push(`(full_name LIKE ? OR doctor_code LIKE ? OR specialization LIKE ?)`);
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (active_only === 'true') {
            conditions.push('is_active = TRUE');
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY full_name ASC';

        const doctors = await query(sql, params);
        res.json(doctors);
    } catch (error) {
        console.error('Get doctors error:', error);
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
});

// Get doctor by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const doctor = await queryOne('SELECT * FROM doctors WHERE id = ?', [req.params.id]);

        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        res.json(doctor);
    } catch (error) {
        console.error('Get doctor error:', error);
        res.status(500).json({ error: 'Failed to fetch doctor' });
    }
});

// Create doctor
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { full_name, specialization, license_number, phone, email, hospital_affiliation } = req.body;

        if (!full_name || !license_number) {
            return res.status(400).json({ error: 'Full name and license number are required' });
        }

        // Check for duplicate license
        const existing = await queryOne('SELECT id FROM doctors WHERE license_number = ?', [license_number]);
        if (existing) {
            return res.status(400).json({ error: 'License number already registered' });
        }

        const doctor_code = await generateDoctorCode();

        const doctorId = await insert(
            `INSERT INTO doctors (doctor_code, full_name, specialization, license_number, phone, email, hospital_affiliation)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [doctor_code, full_name, specialization || null, license_number, phone || null, email || null, hospital_affiliation || null]
        );

        const doctor = await queryOne('SELECT * FROM doctors WHERE id = ?', [doctorId]);
        res.status(201).json(doctor);
    } catch (error) {
        console.error('Create doctor error:', error);
        res.status(500).json({ error: 'Failed to create doctor' });
    }
});

// Update doctor
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { full_name, specialization, license_number, phone, email, hospital_affiliation, is_active } = req.body;

        await update(
            `UPDATE doctors SET 
             full_name = COALESCE(?, full_name),
             specialization = COALESCE(?, specialization),
             license_number = COALESCE(?, license_number),
             phone = COALESCE(?, phone),
             email = COALESCE(?, email),
             hospital_affiliation = COALESCE(?, hospital_affiliation),
             is_active = COALESCE(?, is_active)
             WHERE id = ?`,
            [full_name, specialization, license_number, phone, email, hospital_affiliation, is_active, req.params.id]
        );

        const doctor = await queryOne('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
        res.json(doctor);
    } catch (error) {
        console.error('Update doctor error:', error);
        res.status(500).json({ error: 'Failed to update doctor' });
    }
});

// Delete doctor
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const affected = await remove('DELETE FROM doctors WHERE id = ?', [req.params.id]);

        if (affected === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        res.json({ message: 'Doctor deleted successfully' });
    } catch (error) {
        console.error('Delete doctor error:', error);
        res.status(500).json({ error: 'Failed to delete doctor' });
    }
});

export default router;
