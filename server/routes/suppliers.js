import express from 'express';
import { query, queryOne, insert, update, remove } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all suppliers
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { active_only } = req.query;
        
        let sql = 'SELECT * FROM suppliers';
        if (active_only === 'true') {
            sql += ' WHERE is_active = TRUE';
        }
        sql += ' ORDER BY name ASC';

        const suppliers = await query(sql);
        res.json(suppliers);
    } catch (error) {
        console.error('Get suppliers error:', error);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});

// Get supplier by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const supplier = await queryOne('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        res.json(supplier);
    } catch (error) {
        console.error('Get supplier error:', error);
        res.status(500).json({ error: 'Failed to fetch supplier' });
    }
});

// Create supplier
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, contact_person, phone, email, address } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Supplier name is required' });
        }

        const supplierId = await insert(
            `INSERT INTO suppliers (name, contact_person, phone, email, address)
             VALUES (?, ?, ?, ?, ?)`,
            [name, contact_person || null, phone || null, email || null, address || null]
        );

        const supplier = await queryOne('SELECT * FROM suppliers WHERE id = ?', [supplierId]);
        res.status(201).json(supplier);
    } catch (error) {
        console.error('Create supplier error:', error);
        res.status(500).json({ error: 'Failed to create supplier' });
    }
});

// Update supplier
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, contact_person, phone, email, address, is_active } = req.body;

        await update(
            `UPDATE suppliers SET 
             name = COALESCE(?, name),
             contact_person = COALESCE(?, contact_person),
             phone = COALESCE(?, phone),
             email = COALESCE(?, email),
             address = COALESCE(?, address),
             is_active = COALESCE(?, is_active)
             WHERE id = ?`,
            [name, contact_person, phone, email, address, is_active, req.params.id]
        );

        const supplier = await queryOne('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
        res.json(supplier);
    } catch (error) {
        console.error('Update supplier error:', error);
        res.status(500).json({ error: 'Failed to update supplier' });
    }
});

// Delete supplier
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const affected = await remove('DELETE FROM suppliers WHERE id = ?', [req.params.id]);

        if (affected === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        console.error('Delete supplier error:', error);
        res.status(500).json({ error: 'Failed to delete supplier' });
    }
});

export default router;
