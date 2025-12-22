import express from 'express';
import { query, queryOne, insert } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Default shortcuts
const DEFAULT_SHORTCUTS = [
  { id: 'command-palette', label: 'Command Palette', modifierKeys: 'Ctrl', keyCode: 'K', category: 'General' },
  { id: 'go-dashboard', label: 'Go to Dashboard', modifierKeys: 'Alt', keyCode: '1', category: 'Navigation' },
  { id: 'go-patients', label: 'Go to Patients', modifierKeys: 'Alt', keyCode: '2', category: 'Navigation' },
  { id: 'go-doctors', label: 'Go to Doctors', modifierKeys: 'Alt', keyCode: '3', category: 'Navigation' },
  { id: 'go-medicines', label: 'Go to Medicines', modifierKeys: 'Alt', keyCode: '4', category: 'Navigation' },
  { id: 'go-inventory', label: 'Go to Inventory', modifierKeys: 'Alt', keyCode: '5', category: 'Navigation' },
  { id: 'go-prescriptions', label: 'Go to Prescriptions', modifierKeys: 'Alt', keyCode: '6', category: 'Navigation' },
  { id: 'go-billing', label: 'Go to Billing', modifierKeys: 'Alt', keyCode: '7', category: 'Navigation' },
  { id: 'go-reports', label: 'Go to Reports', modifierKeys: 'Alt', keyCode: '8', category: 'Navigation' },
  { id: 'toggle-theme', label: 'Toggle Theme', modifierKeys: 'Alt', keyCode: 'T', category: 'Actions' },
];

// Get user shortcuts (merged with defaults)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's custom shortcuts
    const userShortcuts = await query(
      `SELECT shortcut_id, modifier_keys, key_code, is_enabled FROM user_shortcuts WHERE user_id = ?`,
      [userId]
    );

    // Merge with defaults
    const shortcuts = DEFAULT_SHORTCUTS.map(defaultShortcut => {
      const userShortcut = userShortcuts.find(us => us.shortcut_id === defaultShortcut.id);
      return {
        ...defaultShortcut,
        modifierKeys: userShortcut?.modifier_keys || defaultShortcut.modifierKeys,
        keyCode: userShortcut?.key_code || defaultShortcut.keyCode,
        isEnabled: userShortcut?.is_enabled ?? true,
        isCustomized: !!userShortcut
      };
    });

    res.json(shortcuts);
  } catch (error) {
    console.error('Get shortcuts error:', error);
    res.status(500).json({ error: 'Failed to get shortcuts' });
  }
});

// Update a shortcut
router.put('/:shortcutId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { shortcutId } = req.params;
    const { modifierKeys, keyCode, isEnabled } = req.body;

    // Validate shortcut exists in defaults
    const defaultShortcut = DEFAULT_SHORTCUTS.find(s => s.id === shortcutId);
    if (!defaultShortcut) {
      return res.status(400).json({ error: 'Invalid shortcut ID' });
    }

    // Check for conflicts
    if (modifierKeys && keyCode) {
      const conflict = await queryOne(
        `SELECT shortcut_id FROM user_shortcuts 
         WHERE user_id = ? AND modifier_keys = ? AND key_code = ? AND shortcut_id != ?`,
        [userId, modifierKeys, keyCode.toUpperCase(), shortcutId]
      );
      
      if (conflict) {
        return res.status(400).json({ error: `This key combination is already used by another shortcut` });
      }
    }

    // Upsert the shortcut
    await query(
      `INSERT INTO user_shortcuts (user_id, shortcut_id, modifier_keys, key_code, is_enabled)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         modifier_keys = VALUES(modifier_keys),
         key_code = VALUES(key_code),
         is_enabled = VALUES(is_enabled)`,
      [userId, shortcutId, modifierKeys || defaultShortcut.modifierKeys, (keyCode || defaultShortcut.keyCode).toUpperCase(), isEnabled ?? true]
    );

    res.json({ 
      message: 'Shortcut updated',
      shortcut: {
        id: shortcutId,
        modifierKeys: modifierKeys || defaultShortcut.modifierKeys,
        keyCode: (keyCode || defaultShortcut.keyCode).toUpperCase(),
        isEnabled: isEnabled ?? true
      }
    });
  } catch (error) {
    console.error('Update shortcut error:', error);
    res.status(500).json({ error: 'Failed to update shortcut' });
  }
});

// Reset a shortcut to default
router.delete('/:shortcutId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { shortcutId } = req.params;

    await query(
      `DELETE FROM user_shortcuts WHERE user_id = ? AND shortcut_id = ?`,
      [userId, shortcutId]
    );

    const defaultShortcut = DEFAULT_SHORTCUTS.find(s => s.id === shortcutId);
    res.json({ 
      message: 'Shortcut reset to default',
      shortcut: defaultShortcut 
    });
  } catch (error) {
    console.error('Reset shortcut error:', error);
    res.status(500).json({ error: 'Failed to reset shortcut' });
  }
});

// Reset all shortcuts to default
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await query(
      `DELETE FROM user_shortcuts WHERE user_id = ?`,
      [userId]
    );

    res.json({ 
      message: 'All shortcuts reset to default',
      shortcuts: DEFAULT_SHORTCUTS
    });
  } catch (error) {
    console.error('Reset all shortcuts error:', error);
    res.status(500).json({ error: 'Failed to reset shortcuts' });
  }
});

export default router;
