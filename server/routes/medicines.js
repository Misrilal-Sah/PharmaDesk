import express from 'express';
import { query, queryOne, insert, update, remove } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Generate medicine code
async function generateMedicineCode() {
    const result = await queryOne('SELECT COUNT(*) as count FROM medicines');
    const count = result.count + 1;
    return `MED${String(count).padStart(6, '0')}`;
}

// Get all medicines
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, category_id, low_stock, limit = 100, offset = 0 } = req.query;
        
        let sql = `
            SELECT m.*, c.name as category_name,
            COALESCE(SUM(b.remaining_quantity), 0) as total_stock
            FROM medicines m
            LEFT JOIN categories c ON m.category_id = c.id
            LEFT JOIN batches b ON m.id = b.medicine_id
        `;
        const params = [];
        const conditions = [];

        if (search) {
            conditions.push(`(m.name LIKE ? OR m.medicine_code LIKE ? OR m.generic_name LIKE ?)`);
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (category_id) {
            conditions.push('m.category_id = ?');
            params.push(category_id);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' GROUP BY m.id';

        if (low_stock === 'true') {
            sql += ' HAVING total_stock <= m.reorder_level';
        }

        sql += ` ORDER BY m.name ASC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const medicines = await query(sql, params);

        // Get total count
        const countResult = await queryOne('SELECT COUNT(*) as total FROM medicines');

        res.json({
            medicines,
            total: countResult.total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Get medicines error:', error);
        res.status(500).json({ error: 'Failed to fetch medicines' });
    }
});

// Get medicine by ID with batches
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const medicine = await queryOne(
            `SELECT m.*, c.name as category_name
             FROM medicines m
             LEFT JOIN categories c ON m.category_id = c.id
             WHERE m.id = ?`,
            [req.params.id]
        );

        if (!medicine) {
            return res.status(404).json({ error: 'Medicine not found' });
        }

        // Get batches
        const batches = await query(
            `SELECT b.*, s.name as supplier_name
             FROM batches b
             LEFT JOIN suppliers s ON b.supplier_id = s.id
             WHERE b.medicine_id = ? AND b.remaining_quantity > 0
             ORDER BY b.expiry_date ASC`,
            [req.params.id]
        );

        // Calculate total stock
        const totalStock = batches.reduce((sum, b) => sum + b.remaining_quantity, 0);

        res.json({ ...medicine, batches, total_stock: totalStock });
    } catch (error) {
        console.error('Get medicine error:', error);
        res.status(500).json({ error: 'Failed to fetch medicine' });
    }
});

// Create medicine
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            name, generic_name, category_id, manufacturer, dosage_form,
            strength, unit_price, selling_price, reorder_level, requires_prescription, description
        } = req.body;

        if (!name || !unit_price || !selling_price) {
            return res.status(400).json({ error: 'Name, unit price, and selling price are required' });
        }

        const medicine_code = await generateMedicineCode();

        const medicineId = await insert(
            `INSERT INTO medicines (medicine_code, name, generic_name, category_id, manufacturer, 
             dosage_form, strength, unit_price, selling_price, reorder_level, requires_prescription, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [medicine_code, name, generic_name || null, category_id || null, manufacturer || null,
             dosage_form || 'Tablet', strength || null, unit_price, selling_price,
             reorder_level || 10, requires_prescription || false, description || null]
        );

        const medicine = await queryOne('SELECT * FROM medicines WHERE id = ?', [medicineId]);
        res.status(201).json(medicine);
    } catch (error) {
        console.error('Create medicine error:', error);
        res.status(500).json({ error: 'Failed to create medicine' });
    }
});

// Update medicine
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const {
            name, generic_name, category_id, manufacturer, dosage_form,
            strength, unit_price, selling_price, reorder_level, requires_prescription, description, is_active
        } = req.body;

        await update(
            `UPDATE medicines SET 
             name = COALESCE(?, name),
             generic_name = COALESCE(?, generic_name),
             category_id = COALESCE(?, category_id),
             manufacturer = COALESCE(?, manufacturer),
             dosage_form = COALESCE(?, dosage_form),
             strength = COALESCE(?, strength),
             unit_price = COALESCE(?, unit_price),
             selling_price = COALESCE(?, selling_price),
             reorder_level = COALESCE(?, reorder_level),
             requires_prescription = COALESCE(?, requires_prescription),
             description = COALESCE(?, description),
             is_active = COALESCE(?, is_active)
             WHERE id = ?`,
            [name, generic_name, category_id, manufacturer, dosage_form, strength,
             unit_price, selling_price, reorder_level, requires_prescription, description, is_active, req.params.id]
        );

        const medicine = await queryOne('SELECT * FROM medicines WHERE id = ?', [req.params.id]);
        res.json(medicine);
    } catch (error) {
        console.error('Update medicine error:', error);
        res.status(500).json({ error: 'Failed to update medicine' });
    }
});

// Delete medicine
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const affected = await remove('DELETE FROM medicines WHERE id = ?', [req.params.id]);

        if (affected === 0) {
            return res.status(404).json({ error: 'Medicine not found' });
        }

        res.json({ message: 'Medicine deleted successfully' });
    } catch (error) {
        console.error('Delete medicine error:', error);
        res.status(500).json({ error: 'Failed to delete medicine' });
    }
});

export default router;
