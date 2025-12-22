import express from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, insert, update, remove } from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const users = await query(
            'SELECT id, username, email, full_name, role, phone, is_active, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const user = await queryOne(
            'SELECT id, username, email, full_name, role, phone, is_active, created_at FROM users WHERE id = ?',
            [req.params.id]
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Create user (Admin only)
router.post('/', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const { username, email, password, full_name, role, phone } = req.body;

        if (!username || !email || !password || !full_name) {
            return res.status(400).json({ error: 'Required fields missing' });
        }

        const existing = await queryOne(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const userId = await insert(
            `INSERT INTO users (username, email, password_hash, full_name, role, phone) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [username, email, password_hash, full_name, role || 'Staff', phone || null]
        );

        const user = await queryOne(
            'SELECT id, username, email, full_name, role, phone FROM users WHERE id = ?',
            [userId]
        );

        res.status(201).json(user);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        // Only admin can update other users
        if (req.user.role !== 'Admin' && req.user.id !== parseInt(req.params.id)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const { full_name, email, phone, role, is_active } = req.body;

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (full_name) { updates.push('full_name = ?'); values.push(full_name); }
        if (email) { updates.push('email = ?'); values.push(email); }
        if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
        
        // Only admin can change role and active status
        if (req.user.role === 'Admin') {
            if (role) { updates.push('role = ?'); values.push(role); }
            if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(req.params.id);
        await update(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

        const user = await queryOne(
            'SELECT id, username, email, full_name, role, phone, is_active FROM users WHERE id = ?',
            [req.params.id]
        );

        res.json(user);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user (Admin only)
router.delete('/:id', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        // Prevent self-deletion
        if (req.user.id === parseInt(req.params.id)) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const affected = await remove('DELETE FROM users WHERE id = ?', [req.params.id]);

        if (affected === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
