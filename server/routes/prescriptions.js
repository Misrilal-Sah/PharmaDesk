import express from 'express';
import { query, queryOne, insert, update } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Generate prescription code
async function generatePrescriptionCode() {
    const result = await queryOne('SELECT COUNT(*) as count FROM prescriptions');
    const count = result.count + 1;
    return `RX${String(count).padStart(7, '0')}`;
}

// Get all prescriptions
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { patient_id, doctor_id, status, limit = 50, offset = 0 } = req.query;

        let sql = `
            SELECT p.*, pt.full_name as patient_name, pt.patient_code,
            d.full_name as doctor_name, d.doctor_code,
            u.full_name as dispensed_by_name
            FROM prescriptions p
            JOIN patients pt ON p.patient_id = pt.id
            JOIN doctors d ON p.doctor_id = d.id
            LEFT JOIN users u ON p.dispensed_by = u.id
        `;
        const params = [];
        const conditions = [];

        if (patient_id) {
            conditions.push('p.patient_id = ?');
            params.push(patient_id);
        }

        if (doctor_id) {
            conditions.push('p.doctor_id = ?');
            params.push(doctor_id);
        }

        if (status) {
            conditions.push('p.status = ?');
            params.push(status);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ` ORDER BY p.prescribed_date DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const prescriptions = await query(sql, params);

        // Get items for each prescription
        for (const rx of prescriptions) {
            rx.items = await query(
                `SELECT pi.*, m.name as medicine_name, m.medicine_code
                 FROM prescription_items pi
                 JOIN medicines m ON pi.medicine_id = m.id
                 WHERE pi.prescription_id = ?`,
                [rx.id]
            );
        }

        res.json(prescriptions);
    } catch (error) {
        console.error('Get prescriptions error:', error);
        res.status(500).json({ error: 'Failed to fetch prescriptions' });
    }
});

// Get prescription by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const prescription = await queryOne(
            `SELECT p.*, pt.full_name as patient_name, pt.patient_code,
             d.full_name as doctor_name, d.doctor_code,
             u.full_name as dispensed_by_name
             FROM prescriptions p
             JOIN patients pt ON p.patient_id = pt.id
             JOIN doctors d ON p.doctor_id = d.id
             LEFT JOIN users u ON p.dispensed_by = u.id
             WHERE p.id = ?`,
            [req.params.id]
        );

        if (!prescription) {
            return res.status(404).json({ error: 'Prescription not found' });
        }

        // Get items
        prescription.items = await query(
            `SELECT pi.*, m.name as medicine_name, m.medicine_code, m.selling_price
             FROM prescription_items pi
             JOIN medicines m ON pi.medicine_id = m.id
             WHERE pi.prescription_id = ?`,
            [req.params.id]
        );

        res.json(prescription);
    } catch (error) {
        console.error('Get prescription error:', error);
        res.status(500).json({ error: 'Failed to fetch prescription' });
    }
});

// Create prescription
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { patient_id, doctor_id, diagnosis, notes, items } = req.body;

        if (!patient_id || !doctor_id || !items || items.length === 0) {
            return res.status(400).json({ error: 'Patient, doctor, and at least one medicine are required' });
        }

        const prescription_code = await generatePrescriptionCode();

        const prescriptionId = await insert(
            `INSERT INTO prescriptions (prescription_code, patient_id, doctor_id, diagnosis, notes)
             VALUES (?, ?, ?, ?, ?)`,
            [prescription_code, patient_id, doctor_id, diagnosis || null, notes || null]
        );

        // Add items
        for (const item of items) {
            await insert(
                `INSERT INTO prescription_items (prescription_id, medicine_id, quantity, dosage, frequency, duration, instructions)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [prescriptionId, item.medicine_id, item.quantity, item.dosage || null,
                 item.frequency || null, item.duration || null, item.instructions || null]
            );
        }

        const prescription = await queryOne('SELECT * FROM prescriptions WHERE id = ?', [prescriptionId]);
        prescription.items = await query('SELECT * FROM prescription_items WHERE prescription_id = ?', [prescriptionId]);

        res.status(201).json(prescription);
    } catch (error) {
        console.error('Create prescription error:', error);
        res.status(500).json({ error: 'Failed to create prescription' });
    }
});

// Update prescription
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { diagnosis, notes, status, items } = req.body;

        await update(
            `UPDATE prescriptions SET 
             diagnosis = COALESCE(?, diagnosis),
             notes = COALESCE(?, notes),
             status = COALESCE(?, status)
             WHERE id = ?`,
            [diagnosis, notes, status, req.params.id]
        );

        // If items provided, update them
        if (items && items.length > 0) {
            // Remove existing items
            await query('DELETE FROM prescription_items WHERE prescription_id = ?', [req.params.id]);

            // Add new items
            for (const item of items) {
                await insert(
                    `INSERT INTO prescription_items (prescription_id, medicine_id, quantity, dosage, frequency, duration, instructions)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [req.params.id, item.medicine_id, item.quantity, item.dosage || null,
                     item.frequency || null, item.duration || null, item.instructions || null]
                );
            }
        }

        const prescription = await queryOne('SELECT * FROM prescriptions WHERE id = ?', [req.params.id]);
        prescription.items = await query('SELECT * FROM prescription_items WHERE prescription_id = ?', [req.params.id]);

        res.json(prescription);
    } catch (error) {
        console.error('Update prescription error:', error);
        res.status(500).json({ error: 'Failed to update prescription' });
    }
});

// Dispense prescription
router.post('/:id/dispense', authenticateToken, async (req, res) => {
    try {
        const prescription = await queryOne('SELECT * FROM prescriptions WHERE id = ?', [req.params.id]);

        if (!prescription) {
            return res.status(404).json({ error: 'Prescription not found' });
        }

        if (prescription.status === 'Dispensed') {
            return res.status(400).json({ error: 'Prescription already dispensed' });
        }

        // Get prescription items
        const items = await query('SELECT * FROM prescription_items WHERE prescription_id = ?', [req.params.id]);

        // Check stock availability
        for (const item of items) {
            const stockResult = await queryOne(
                `SELECT COALESCE(SUM(remaining_quantity), 0) as total FROM batches WHERE medicine_id = ? AND remaining_quantity > 0`,
                [item.medicine_id]
            );

            if (stockResult.total < item.quantity) {
                const medicine = await queryOne('SELECT name FROM medicines WHERE id = ?', [item.medicine_id]);
                return res.status(400).json({ 
                    error: `Insufficient stock for ${medicine.name}. Available: ${stockResult.total}, Required: ${item.quantity}` 
                });
            }
        }

        // Deduct stock using FIFO
        for (const item of items) {
            let remainingQty = item.quantity;

            const batches = await query(
                `SELECT * FROM batches WHERE medicine_id = ? AND remaining_quantity > 0 ORDER BY expiry_date ASC`,
                [item.medicine_id]
            );

            for (const batch of batches) {
                if (remainingQty <= 0) break;

                const deductQty = Math.min(batch.remaining_quantity, remainingQty);
                await update(
                    'UPDATE batches SET remaining_quantity = remaining_quantity - ? WHERE id = ?',
                    [deductQty, batch.id]
                );

                // Log transaction
                await insert(
                    `INSERT INTO inventory_transactions (medicine_id, batch_id, transaction_type, quantity, reference_id, performed_by)
                     VALUES (?, ?, 'Sale', ?, ?, ?)`,
                    [item.medicine_id, batch.id, -deductQty, prescription.id, req.user.id]
                );

                remainingQty -= deductQty;
            }

            // Mark item as dispensed
            await update('UPDATE prescription_items SET is_dispensed = TRUE WHERE id = ?', [item.id]);
        }

        // Update prescription status
        await update(
            `UPDATE prescriptions SET status = 'Dispensed', dispensed_date = NOW(), dispensed_by = ? WHERE id = ?`,
            [req.user.id, req.params.id]
        );

        res.json({ message: 'Prescription dispensed successfully' });
    } catch (error) {
        console.error('Dispense prescription error:', error);
        res.status(500).json({ error: 'Failed to dispense prescription' });
    }
});

export default router;
