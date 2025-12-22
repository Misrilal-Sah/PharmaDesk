import express from 'express';
import { query, queryOne, insert, update } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get inventory overview
router.get('/overview', authenticateToken, async (req, res) => {
    try {
        // Total medicines
        const totalMeds = await queryOne('SELECT COUNT(*) as count FROM medicines WHERE is_active = TRUE');

        // Low stock items
        const lowStock = await query(`
            SELECT m.id, m.medicine_code, m.name, m.reorder_level,
            COALESCE(SUM(b.remaining_quantity), 0) as total_stock
            FROM medicines m
            LEFT JOIN batches b ON m.id = b.medicine_id
            WHERE m.is_active = TRUE
            GROUP BY m.id
            HAVING total_stock <= m.reorder_level
            ORDER BY total_stock ASC
            LIMIT 10
        `);

        // Expiring soon (within 30 days)
        const expiringSoon = await query(`
            SELECT b.*, m.name as medicine_name, m.medicine_code
            FROM batches b
            JOIN medicines m ON b.medicine_id = m.id
            WHERE b.remaining_quantity > 0 
            AND b.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            AND b.expiry_date >= CURDATE()
            ORDER BY b.expiry_date ASC
            LIMIT 10
        `);

        // Expired items
        const expired = await query(`
            SELECT b.*, m.name as medicine_name, m.medicine_code
            FROM batches b
            JOIN medicines m ON b.medicine_id = m.id
            WHERE b.remaining_quantity > 0 AND b.expiry_date < CURDATE()
            ORDER BY b.expiry_date DESC
            LIMIT 10
        `);

        // Total inventory value
        const inventoryValue = await queryOne(`
            SELECT COALESCE(SUM(b.remaining_quantity * m.unit_price), 0) as total_value
            FROM batches b
            JOIN medicines m ON b.medicine_id = m.id
            WHERE b.remaining_quantity > 0
        `);

        res.json({
            total_medicines: totalMeds.count,
            low_stock_count: lowStock.length,
            low_stock_items: lowStock,
            expiring_soon_count: expiringSoon.length,
            expiring_soon: expiringSoon,
            expired_count: expired.length,
            expired_items: expired,
            total_inventory_value: inventoryValue.total_value
        });
    } catch (error) {
        console.error('Get inventory overview error:', error);
        res.status(500).json({ error: 'Failed to fetch inventory overview' });
    }
});

// Get all batches
router.get('/batches', authenticateToken, async (req, res) => {
    try {
        const { medicine_id, expiring, expired } = req.query;

        let sql = `
            SELECT b.*, m.name as medicine_name, m.medicine_code, s.name as supplier_name
            FROM batches b
            JOIN medicines m ON b.medicine_id = m.id
            LEFT JOIN suppliers s ON b.supplier_id = s.id
            WHERE b.remaining_quantity > 0
        `;
        const params = [];

        if (medicine_id) {
            sql += ' AND b.medicine_id = ?';
            params.push(medicine_id);
        }

        if (expiring === 'true') {
            sql += ' AND b.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND b.expiry_date >= CURDATE()';
        }

        if (expired === 'true') {
            sql += ' AND b.expiry_date < CURDATE()';
        }

        sql += ' ORDER BY b.expiry_date ASC';

        const batches = await query(sql, params);
        res.json(batches);
    } catch (error) {
        console.error('Get batches error:', error);
        res.status(500).json({ error: 'Failed to fetch batches' });
    }
});

// Add new batch (stock purchase)
router.post('/batches', authenticateToken, async (req, res) => {
    try {
        const {
            medicine_id, batch_number, supplier_id, quantity,
            purchase_price, manufacture_date, expiry_date
        } = req.body;

        if (!medicine_id || !batch_number || !quantity || !expiry_date) {
            return res.status(400).json({ error: 'Medicine, batch number, quantity, and expiry date are required' });
        }

        const batchId = await insert(
            `INSERT INTO batches (medicine_id, batch_number, supplier_id, quantity, remaining_quantity,
             purchase_price, manufacture_date, expiry_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [medicine_id, batch_number, supplier_id || null, quantity, quantity,
             purchase_price || null, manufacture_date || null, expiry_date]
        );

        // Log transaction
        await insert(
            `INSERT INTO inventory_transactions (medicine_id, batch_id, transaction_type, quantity, performed_by, notes)
             VALUES (?, ?, 'Purchase', ?, ?, ?)`,
            [medicine_id, batchId, quantity, req.user.id, `New batch: ${batch_number}`]
        );

        const batch = await queryOne(
            `SELECT b.*, m.name as medicine_name FROM batches b
             JOIN medicines m ON b.medicine_id = m.id WHERE b.id = ?`,
            [batchId]
        );

        res.status(201).json(batch);
    } catch (error) {
        console.error('Add batch error:', error);
        res.status(500).json({ error: 'Failed to add batch' });
    }
});

// Adjust stock
router.post('/adjust', authenticateToken, async (req, res) => {
    try {
        const { batch_id, adjustment, reason } = req.body;

        if (!batch_id || adjustment === undefined) {
            return res.status(400).json({ error: 'Batch ID and adjustment are required' });
        }

        const batch = await queryOne('SELECT * FROM batches WHERE id = ?', [batch_id]);
        if (!batch) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        const newQuantity = batch.remaining_quantity + adjustment;
        if (newQuantity < 0) {
            return res.status(400).json({ error: 'Adjustment would result in negative stock' });
        }

        await update(
            'UPDATE batches SET remaining_quantity = ? WHERE id = ?',
            [newQuantity, batch_id]
        );

        // Log adjustment
        await insert(
            `INSERT INTO inventory_transactions (medicine_id, batch_id, transaction_type, quantity, performed_by, notes)
             VALUES (?, ?, 'Adjustment', ?, ?, ?)`,
            [batch.medicine_id, batch_id, adjustment, req.user.id, reason || 'Stock adjustment']
        );

        res.json({ message: 'Stock adjusted successfully', new_quantity: newQuantity });
    } catch (error) {
        console.error('Adjust stock error:', error);
        res.status(500).json({ error: 'Failed to adjust stock' });
    }
});

// Get inventory transactions
router.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const { medicine_id, type, limit = 50 } = req.query;

        let sql = `
            SELECT it.*, m.name as medicine_name, m.medicine_code, 
            b.batch_number, u.full_name as performed_by_name
            FROM inventory_transactions it
            JOIN medicines m ON it.medicine_id = m.id
            LEFT JOIN batches b ON it.batch_id = b.id
            LEFT JOIN users u ON it.performed_by = u.id
        `;
        const params = [];
        const conditions = [];

        if (medicine_id) {
            conditions.push('it.medicine_id = ?');
            params.push(medicine_id);
        }

        if (type) {
            conditions.push('it.transaction_type = ?');
            params.push(type);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY it.created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const transactions = await query(sql, params);
        res.json(transactions);
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

export default router;
