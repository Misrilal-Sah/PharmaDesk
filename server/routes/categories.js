import express from 'express';
import { query, queryOne, insert, update, remove } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all categories
router.get('/', authenticateToken, async (req, res) => {
    try {
        const categories = await query(`
            SELECT c.*, COUNT(m.id) as medicine_count
            FROM categories c
            LEFT JOIN medicines m ON c.id = m.category_id
            GROUP BY c.id
            ORDER BY c.name ASC
        `);
        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Create category
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Category name is required' });
        }

        const categoryId = await insert(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name, description || null]
        );

        const category = await queryOne('SELECT * FROM categories WHERE id = ?', [categoryId]);
        res.status(201).json(category);
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// Update category
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, description } = req.body;

        await update(
            'UPDATE categories SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?',
            [name, description, req.params.id]
        );

        const category = await queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
        res.json(category);
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

// Delete category
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const affected = await remove('DELETE FROM categories WHERE id = ?', [req.params.id]);

        if (affected === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

export default router;
