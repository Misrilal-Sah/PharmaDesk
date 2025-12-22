import express from 'express';
import { query, queryOne, insert, update, remove } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Generate patient code
async function generatePatientCode() {
    const result = await queryOne('SELECT COUNT(*) as count FROM patients');
    const count = result.count + 1;
    return `PAT${String(count).padStart(6, '0')}`;
}

// Get all patients
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, limit = 50, offset = 0 } = req.query;
        
        let sql = 'SELECT * FROM patients';
        const params = [];

        if (search) {
            sql += ` WHERE full_name LIKE ? OR patient_code LIKE ? OR phone LIKE ? OR email LIKE ?`;
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        sql += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const patients = await query(sql, params);
        
        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM patients';
        if (search) {
            countSql += ` WHERE full_name LIKE ? OR patient_code LIKE ? OR phone LIKE ? OR email LIKE ?`;
        }
        const countResult = await queryOne(countSql, search ? params.slice(0, 4) : []);

        res.json({
            patients,
            total: countResult.total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Get patients error:', error);
        res.status(500).json({ error: 'Failed to fetch patients' });
    }
});

// Get patient by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const patient = await queryOne('SELECT * FROM patients WHERE id = ?', [req.params.id]);

        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        // Get patient's prescriptions
        const prescriptions = await query(
            `SELECT p.*, d.full_name as doctor_name 
             FROM prescriptions p 
             LEFT JOIN doctors d ON p.doctor_id = d.id 
             WHERE p.patient_id = ? 
             ORDER BY p.prescribed_date DESC 
             LIMIT 10`,
            [req.params.id]
        );

        res.json({ ...patient, prescriptions });
    } catch (error) {
        console.error('Get patient error:', error);
        res.status(500).json({ error: 'Failed to fetch patient' });
    }
});

// Create patient
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            full_name, date_of_birth, gender, phone, email, address,
            blood_group, allergies, medical_history, emergency_contact, emergency_phone
        } = req.body;

        if (!full_name) {
            return res.status(400).json({ error: 'Full name is required' });
        }

        const patient_code = await generatePatientCode();

        const patientId = await insert(
            `INSERT INTO patients (patient_code, full_name, date_of_birth, gender, phone, email, 
             address, blood_group, allergies, medical_history, emergency_contact, emergency_phone)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [patient_code, full_name, date_of_birth || null, gender || null, phone || null,
             email || null, address || null, blood_group || null, allergies || null,
             medical_history || null, emergency_contact || null, emergency_phone || null]
        );

        const patient = await queryOne('SELECT * FROM patients WHERE id = ?', [patientId]);
        res.status(201).json(patient);
    } catch (error) {
        console.error('Create patient error:', error);
        res.status(500).json({ error: 'Failed to create patient' });
    }
});

// Update patient
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const {
            full_name, date_of_birth, gender, phone, email, address,
            blood_group, allergies, medical_history, emergency_contact, emergency_phone
        } = req.body;

        await update(
            `UPDATE patients SET 
             full_name = COALESCE(?, full_name),
             date_of_birth = COALESCE(?, date_of_birth),
             gender = COALESCE(?, gender),
             phone = COALESCE(?, phone),
             email = COALESCE(?, email),
             address = COALESCE(?, address),
             blood_group = COALESCE(?, blood_group),
             allergies = COALESCE(?, allergies),
             medical_history = COALESCE(?, medical_history),
             emergency_contact = COALESCE(?, emergency_contact),
             emergency_phone = COALESCE(?, emergency_phone)
             WHERE id = ?`,
            [full_name, date_of_birth, gender, phone, email, address,
             blood_group, allergies, medical_history, emergency_contact, emergency_phone, req.params.id]
        );

        const patient = await queryOne('SELECT * FROM patients WHERE id = ?', [req.params.id]);
        res.json(patient);
    } catch (error) {
        console.error('Update patient error:', error);
        res.status(500).json({ error: 'Failed to update patient' });
    }
});

// Delete patient
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const affected = await remove('DELETE FROM patients WHERE id = ?', [req.params.id]);

        if (affected === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        res.json({ message: 'Patient deleted successfully' });
    } catch (error) {
        console.error('Delete patient error:', error);
        res.status(500).json({ error: 'Failed to delete patient' });
    }
});

// Get patient timeline (complete history)
router.get('/:id/timeline', authenticateToken, async (req, res) => {
    try {
        const patientId = req.params.id;
        
        // Check if patient exists
        const patient = await queryOne('SELECT id, full_name, patient_code FROM patients WHERE id = ?', [patientId]);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        const timeline = [];

        // Get prescriptions
        const prescriptions = await query(`
            SELECT 
                p.id, p.prescribed_date as event_date, p.diagnosis, p.status,
                d.full_name as doctor_name, d.specialization
            FROM prescriptions p
            LEFT JOIN doctors d ON p.doctor_id = d.id
            WHERE p.patient_id = ?
            ORDER BY p.prescribed_date DESC
        `, [patientId]);

        for (const rx of prescriptions) {
            // Get prescription items
            const items = await query(`
                SELECT m.name as medicine_name, pi.dosage, pi.duration, pi.quantity
                FROM prescription_items pi
                JOIN medicines m ON pi.medicine_id = m.id
                WHERE pi.prescription_id = ?
            `, [rx.id]);

            timeline.push({
                type: 'prescription',
                icon: 'FileText',
                date: rx.event_date,
                title: 'Prescription',
                subtitle: rx.doctor_name ? `Dr. ${rx.doctor_name}` : 'Unknown Doctor',
                status: rx.status,
                details: {
                    diagnosis: rx.diagnosis,
                    specialization: rx.specialization,
                    medicines: items.map(i => ({
                        name: i.medicine_name,
                        dosage: i.dosage,
                        duration: i.duration,
                        quantity: i.quantity
                    }))
                }
            });
        }

        // Get purchases/sales
        const purchases = await query(`
            SELECT 
                s.id, s.sale_date as event_date, s.invoice_number, 
                s.total_amount, s.payment_status, s.payment_method,
                u.full_name as served_by
            FROM sales s
            JOIN users u ON s.sold_by = u.id
            WHERE s.patient_id = ?
            ORDER BY s.sale_date DESC
        `, [patientId]);

        for (const sale of purchases) {
            // Get sale items
            const items = await query(`
                SELECT m.name as medicine_name, si.quantity, si.unit_price, si.total_price
                FROM sale_items si
                JOIN medicines m ON si.medicine_id = m.id
                WHERE si.sale_id = ?
            `, [sale.id]);

            timeline.push({
                type: 'purchase',
                icon: 'ShoppingCart',
                date: sale.event_date,
                title: 'Purchase',
                subtitle: `Invoice #${sale.invoice_number}`,
                status: sale.payment_status,
                details: {
                    amount: sale.total_amount,
                    payment_method: sale.payment_method,
                    served_by: sale.served_by,
                    items: items.map(i => ({
                        name: i.medicine_name,
                        quantity: i.quantity,
                        price: i.unit_price,
                        total: i.total_price
                    }))
                }
            });
        }

        // Sort timeline by date (newest first)
        timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            patient,
            timeline,
            stats: {
                totalPrescriptions: prescriptions.length,
                totalPurchases: purchases.length,
                totalSpent: purchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0)
            }
        });
    } catch (error) {
        console.error('Get patient timeline error:', error);
        res.status(500).json({ error: 'Failed to fetch patient timeline' });
    }
});

export default router;
