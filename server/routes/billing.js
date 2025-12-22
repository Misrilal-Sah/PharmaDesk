import express from 'express';
import { query, queryOne, insert, update } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendInvoiceEmail } from '../services/email.js';

const router = express.Router();

// Generate invoice number
async function generateInvoiceNumber() {
    const today = new Date();
    const prefix = `INV${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    const result = await queryOne(
        'SELECT COUNT(*) as count FROM sales WHERE invoice_number LIKE ?',
        [`${prefix}%`]
    );
    const count = result.count + 1;
    return `${prefix}${String(count).padStart(4, '0')}`;
}

// Get all sales
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { patient_id, payment_status, start_date, end_date, limit = 50, offset = 0 } = req.query;

        let sql = `
            SELECT s.*, p.full_name as patient_name, p.patient_code,
            u.full_name as sold_by_name
            FROM sales s
            LEFT JOIN patients p ON s.patient_id = p.id
            JOIN users u ON s.sold_by = u.id
        `;
        const params = [];
        const conditions = [];

        if (patient_id) {
            conditions.push('s.patient_id = ?');
            params.push(patient_id);
        }

        if (payment_status) {
            conditions.push('s.payment_status = ?');
            params.push(payment_status);
        }

        if (start_date) {
            conditions.push('DATE(s.sale_date) >= ?');
            params.push(start_date);
        }

        if (end_date) {
            conditions.push('DATE(s.sale_date) <= ?');
            params.push(end_date);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY s.sale_date DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const sales = await query(sql, params);
        res.json(sales);
    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
});

// Get sale by ID (invoice details)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const sale = await queryOne(
            `SELECT s.*, p.full_name as patient_name, p.patient_code, p.phone as patient_phone,
             u.full_name as sold_by_name
             FROM sales s
             LEFT JOIN patients p ON s.patient_id = p.id
             JOIN users u ON s.sold_by = u.id
             WHERE s.id = ?`,
            [req.params.id]
        );

        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        // Get items
        sale.items = await query(
            `SELECT si.*, m.name as medicine_name, m.medicine_code
             FROM sale_items si
             JOIN medicines m ON si.medicine_id = m.id
             WHERE si.sale_id = ?`,
            [req.params.id]
        );

        res.json(sale);
    } catch (error) {
        console.error('Get sale error:', error);
        res.status(500).json({ error: 'Failed to fetch sale' });
    }
});

// Create sale (generate invoice)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            patient_id, prescription_id, items, tax_rate = 0,
            discount_amount = 0, payment_method, notes
        } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'At least one item is required' });
        }

        // Calculate totals
        let subtotal = 0;
        const processedItems = [];

        for (const item of items) {
            const medicine = await queryOne('SELECT * FROM medicines WHERE id = ?', [item.medicine_id]);
            if (!medicine) {
                return res.status(400).json({ error: `Medicine not found: ${item.medicine_id}` });
            }

            // Check stock
            const stockResult = await queryOne(
                `SELECT COALESCE(SUM(remaining_quantity), 0) as total FROM batches WHERE medicine_id = ? AND remaining_quantity > 0`,
                [item.medicine_id]
            );

            if (stockResult.total < item.quantity) {
                return res.status(400).json({ 
                    error: `Insufficient stock for ${medicine.name}. Available: ${stockResult.total}` 
                });
            }

            const unit_price = item.unit_price || medicine.selling_price;
            const total_price = unit_price * item.quantity;
            subtotal += total_price;

            processedItems.push({
                ...item,
                unit_price,
                total_price
            });
        }

        const tax_amount = subtotal * (tax_rate / 100);
        const total_amount = subtotal + tax_amount - discount_amount;

        const invoice_number = await generateInvoiceNumber();

        // Create sale
        const saleId = await insert(
            `INSERT INTO sales (invoice_number, patient_id, prescription_id, subtotal, tax_amount, 
             discount_amount, total_amount, payment_method, payment_status, notes, sold_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [invoice_number, patient_id || null, prescription_id || null, subtotal, tax_amount,
             discount_amount, total_amount, payment_method || 'Cash', 'Paid', notes || null, req.user.id]
        );

        // Add items and deduct stock
        for (const item of processedItems) {
            // Find batch using FIFO
            let remainingQty = item.quantity;
            let selectedBatchId = null;

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

                if (!selectedBatchId) selectedBatchId = batch.id;

                // Log transaction
                await insert(
                    `INSERT INTO inventory_transactions (medicine_id, batch_id, transaction_type, quantity, reference_id, performed_by)
                     VALUES (?, ?, 'Sale', ?, ?, ?)`,
                    [item.medicine_id, batch.id, -deductQty, saleId, req.user.id]
                );

                remainingQty -= deductQty;
            }

            // Add sale item
            await insert(
                `INSERT INTO sale_items (sale_id, medicine_id, batch_id, quantity, unit_price, total_price)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [saleId, item.medicine_id, selectedBatchId, item.quantity, item.unit_price, item.total_price]
            );
        }

        // Update prescription if linked
        if (prescription_id) {
            await update(
                `UPDATE prescriptions SET status = 'Dispensed', dispensed_date = NOW(), dispensed_by = ? WHERE id = ?`,
                [req.user.id, prescription_id]
            );
        }

        const sale = await queryOne('SELECT * FROM sales WHERE id = ?', [saleId]);
        sale.items = await query('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);

        res.status(201).json(sale);
    } catch (error) {
        console.error('Create sale error:', error);
        res.status(500).json({ error: 'Failed to create sale' });
    }
});

// Update payment status
router.put('/:id/payment', authenticateToken, async (req, res) => {
    try {
        const { payment_status, payment_method } = req.body;

        await update(
            `UPDATE sales SET 
             payment_status = COALESCE(?, payment_status),
             payment_method = COALESCE(?, payment_method)
             WHERE id = ?`,
            [payment_status, payment_method, req.params.id]
        );

        const sale = await queryOne('SELECT * FROM sales WHERE id = ?', [req.params.id]);
        res.json(sale);
    } catch (error) {
        console.error('Update payment error:', error);
        res.status(500).json({ error: 'Failed to update payment' });
    }
});

// Get today's sales summary
router.get('/summary/today', authenticateToken, async (req, res) => {
    try {
        const summary = await queryOne(`
            SELECT 
                COUNT(*) as total_sales,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN total_amount ELSE 0 END), 0) as paid_amount,
                COALESCE(SUM(CASE WHEN payment_status = 'Pending' THEN total_amount ELSE 0 END), 0) as pending_amount
            FROM sales
            WHERE DATE(sale_date) = CURDATE()
        `);

        res.json(summary);
    } catch (error) {
        console.error('Get today summary error:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

// Send invoice email to customer
router.post('/:id/send-email', authenticateToken, async (req, res) => {
    try {
        const { email } = req.body;
        const saleId = req.params.id;

        if (!email) {
            return res.status(400).json({ error: 'Email address is required' });
        }

        // Get invoice details
        const sale = await queryOne(
            `SELECT s.*, p.full_name as patient_name, p.patient_code,
             u.full_name as sold_by_name
             FROM sales s
             LEFT JOIN patients p ON s.patient_id = p.id
             JOIN users u ON s.sold_by = u.id
             WHERE s.id = ?`,
            [saleId]
        );

        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        // Get items
        sale.items = await query(
            `SELECT si.*, m.name as medicine_name, m.medicine_code
             FROM sale_items si
             JOIN medicines m ON si.medicine_id = m.id
             WHERE si.sale_id = ?`,
            [saleId]
        );

        // Send email
        const sent = await sendInvoiceEmail(email, sale);

        if (sent) {
            res.json({ message: 'Receipt sent successfully', email });
        } else {
            res.status(500).json({ error: 'Failed to send email. Please try again.' });
        }
    } catch (error) {
        console.error('Send invoice email error:', error);
        res.status(500).json({ error: 'Failed to send receipt' });
    }
});

export default router;
