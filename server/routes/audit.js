import express from 'express';
import { query, queryOne } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get audit logs (Admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { 
      page = 1, 
      limit = 50, 
      user_id, 
      action, 
      entity_type, 
      start_date, 
      end_date,
      search 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = '1=1';
    const params = [];

    if (user_id) {
      whereClause += ' AND user_id = ?';
      params.push(user_id);
    }

    if (action) {
      whereClause += ' AND action = ?';
      params.push(action);
    }

    if (entity_type) {
      whereClause += ' AND entity_type = ?';
      params.push(entity_type);
    }

    if (start_date) {
      whereClause += ' AND DATE(created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND DATE(created_at) <= ?';
      params.push(end_date);
    }

    if (search) {
      whereClause += ' AND (user_name LIKE ? OR entity_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total FROM audit_logs WHERE ${whereClause}`,
      params
    );

    // Get logs
    const logs = await query(
      `SELECT id, user_id, user_name, action, entity_type, entity_id, entity_name, 
              old_values, new_values, ip_address, created_at
       FROM audit_logs 
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Parse JSON fields
    const parsedLogs = logs.map(log => ({
      ...log,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null
    }));

    res.json({
      logs: parsedLogs,
      total: countResult?.total || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((countResult?.total || 0) / limit)
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

// Get audit log statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [actionStats, entityStats, dailyStats] = await Promise.all([
      // Actions by type
      query(`
        SELECT action, COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY action 
        ORDER BY count DESC
      `),
      // Actions by entity
      query(`
        SELECT entity_type, COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY entity_type 
        ORDER BY count DESC
      `),
      // Daily activity
      query(`
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at) 
        ORDER BY date
      `)
    ]);

    res.json({
      byAction: actionStats,
      byEntity: entityStats,
      daily: dailyStats
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({ error: 'Failed to get audit statistics' });
  }
});

// Get available filter options
router.get('/filters', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [users, actions, entities] = await Promise.all([
      query(`SELECT DISTINCT user_id, user_name FROM audit_logs WHERE user_id IS NOT NULL ORDER BY user_name`),
      query(`SELECT DISTINCT action FROM audit_logs ORDER BY action`),
      query(`SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type`)
    ]);

    res.json({
      users: users.map(u => ({ id: u.user_id, name: u.user_name })),
      actions: actions.map(a => a.action),
      entities: entities.map(e => e.entity_type)
    });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ error: 'Failed to get filter options' });
  }
});

export default router;
