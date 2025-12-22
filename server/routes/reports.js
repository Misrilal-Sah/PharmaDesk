import express from 'express';
import { query, queryOne } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        // Today's sales
        const todaySales = await queryOne(`
            SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
            FROM sales WHERE DATE(sale_date) = CURDATE()
        `);

        // This month's sales
        const monthSales = await queryOne(`
            SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
            FROM sales WHERE MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())
        `);

        // Total patients
        const totalPatients = await queryOne('SELECT COUNT(*) as count FROM patients');

        // Total medicines
        const totalMedicines = await queryOne('SELECT COUNT(*) as count FROM medicines WHERE is_active = TRUE');

        // Low stock count
        const lowStock = await queryOne(`
            SELECT COUNT(*) as count FROM (
                SELECT m.id, m.reorder_level, COALESCE(SUM(b.remaining_quantity), 0) as total_stock
                FROM medicines m
                LEFT JOIN batches b ON m.id = b.medicine_id
                WHERE m.is_active = TRUE
                GROUP BY m.id, m.reorder_level
                HAVING total_stock <= m.reorder_level
            ) as low_stock_items
        `);

        // Expiring soon (30 days)
        const expiringSoon = await queryOne(`
            SELECT COUNT(DISTINCT medicine_id) as count FROM batches
            WHERE remaining_quantity > 0 
            AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            AND expiry_date >= CURDATE()
        `);

        // Pending prescriptions
        const pendingRx = await queryOne(
            `SELECT COUNT(*) as count FROM prescriptions WHERE status = 'Pending'`
        );

        // Recent sales
        const recentSales = await query(`
            SELECT s.*, p.full_name as patient_name
            FROM sales s
            LEFT JOIN patients p ON s.patient_id = p.id
            ORDER BY s.sale_date DESC LIMIT 5
        `);

        res.json({
            today_sales: todaySales,
            month_sales: monthSales,
            total_patients: totalPatients.count,
            total_medicines: totalMedicines.count,
            low_stock_count: lowStock.count,
            expiring_soon_count: expiringSoon.count,
            pending_prescriptions: pendingRx.count,
            recent_sales: recentSales
        });
    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Sales report
router.get('/sales', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date, group_by = 'day' } = req.query;

        let dateFormat;
        switch (group_by) {
            case 'month': dateFormat = '%Y-%m'; break;
            case 'year': dateFormat = '%Y'; break;
            default: dateFormat = '%Y-%m-%d';
        }

        let sql = `
            SELECT DATE_FORMAT(sale_date, ?) as period,
            COUNT(*) as total_sales,
            SUM(total_amount) as revenue,
            SUM(discount_amount) as total_discounts
            FROM sales
        `;
        const params = [dateFormat];

        if (start_date && end_date) {
            sql += ' WHERE DATE(sale_date) BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }

        sql += ' GROUP BY period ORDER BY period ASC';

        const report = await query(sql, params);
        
        // Format for dashboard chart - return with daily_sales wrapper
        res.json({ daily_sales: report, data: report });
    } catch (error) {
        console.error('Get sales report error:', error);
        res.status(500).json({ error: 'Failed to fetch sales report' });
    }
});

// Top selling medicines
router.get('/top-medicines', authenticateToken, async (req, res) => {
    try {
        const { limit = 10, start_date, end_date } = req.query;

        let sql = `
            SELECT m.id, m.name, m.medicine_code,
            SUM(si.quantity) as total_sold,
            SUM(si.total_price) as total_revenue
            FROM sale_items si
            JOIN medicines m ON si.medicine_id = m.id
            JOIN sales s ON si.sale_id = s.id
        `;
        const params = [];

        if (start_date && end_date) {
            sql += ' WHERE DATE(s.sale_date) BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }

        sql += ' GROUP BY m.id ORDER BY total_sold DESC LIMIT ?';
        params.push(parseInt(limit));

        const medicines = await query(sql, params);
        res.json(medicines);
    } catch (error) {
        console.error('Get top medicines error:', error);
        res.status(500).json({ error: 'Failed to fetch top medicines' });
    }
});

// Inventory report
router.get('/inventory', authenticateToken, async (req, res) => {
    try {
        const medicines = await query(`
            SELECT m.id, m.medicine_code, m.name, m.category_id, c.name as category_name,
            m.unit_price, m.selling_price, m.reorder_level,
            COALESCE(SUM(b.remaining_quantity), 0) as current_stock,
            MIN(b.expiry_date) as earliest_expiry
            FROM medicines m
            LEFT JOIN categories c ON m.category_id = c.id
            LEFT JOIN batches b ON m.id = b.medicine_id AND b.remaining_quantity > 0
            WHERE m.is_active = TRUE
            GROUP BY m.id
            ORDER BY current_stock ASC
        `);

        // Group by category for pie chart
        const byCategory = await query(`
            SELECT 
                COALESCE(c.name, 'Uncategorized') as category,
                COALESCE(SUM(b.remaining_quantity * m.unit_price), 0) as total_value
            FROM medicines m
            LEFT JOIN categories c ON m.category_id = c.id
            LEFT JOIN batches b ON m.id = b.medicine_id AND b.remaining_quantity > 0
            WHERE m.is_active = TRUE
            GROUP BY c.id, c.name
            HAVING total_value > 0
            ORDER BY total_value DESC
        `);

        const summary = {
            total_items: medicines.length,
            low_stock: medicines.filter(m => m.current_stock <= m.reorder_level).length,
            out_of_stock: medicines.filter(m => m.current_stock === 0).length,
            total_value: medicines.reduce((sum, m) => sum + (m.current_stock * m.unit_price), 0)
        };

        res.json({ summary, medicines, by_category: byCategory });
    } catch (error) {
        console.error('Get inventory report error:', error);
        res.status(500).json({ error: 'Failed to fetch inventory report' });
    }
});

// Expiry report
router.get('/expiry', authenticateToken, async (req, res) => {
    try {
        const { days = 30 } = req.query;

        const batches = await query(`
            SELECT b.*, m.name as medicine_name, m.medicine_code,
            DATEDIFF(b.expiry_date, CURDATE()) as days_until_expiry
            FROM batches b
            JOIN medicines m ON b.medicine_id = m.id
            WHERE b.remaining_quantity > 0
            AND b.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
            ORDER BY b.expiry_date ASC
        `, [parseInt(days)]);

        const expired = batches.filter(b => b.days_until_expiry < 0);
        const expiringSoon = batches.filter(b => b.days_until_expiry >= 0);

        res.json({
            expired,
            expiring_soon: expiringSoon,
            expired_count: expired.length,
            expiring_count: expiringSoon.length
        });
    } catch (error) {
        console.error('Get expiry report error:', error);
        res.status(500).json({ error: 'Failed to fetch expiry report' });
    }
});

// Prescription stats
router.get('/prescriptions', authenticateToken, async (req, res) => {
    try {
        const stats = await query(`
            SELECT status, COUNT(*) as count
            FROM prescriptions
            GROUP BY status
        `);

        const byDoctor = await query(`
            SELECT d.id, d.full_name, COUNT(p.id) as prescription_count
            FROM doctors d
            LEFT JOIN prescriptions p ON d.id = p.doctor_id
            GROUP BY d.id
            ORDER BY prescription_count DESC
            LIMIT 10
        `);

        res.json({ stats, by_doctor: byDoctor });
    } catch (error) {
        console.error('Get prescription stats error:', error);
        res.status(500).json({ error: 'Failed to fetch prescription stats' });
    }
});

export default router;
