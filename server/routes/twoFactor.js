import express from 'express';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, queryOne, update } from '../db/database.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';

const router = express.Router();

// App name for authenticator
const APP_NAME = 'PharmaDesk';

// Generate backup codes
function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

// Setup 2FA - Generate secret and QR code
router.post('/setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user
    const user = await queryOne('SELECT username, email, two_factor_enabled FROM users WHERE id = ?', [userId]);
    
    if (user.two_factor_enabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }
    
    // Generate secret
    const secret = authenticator.generateSecret();
    
    // Generate QR code URI
    const otpauthUrl = authenticator.keyuri(user.email || user.username, APP_NAME, secret);
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    
    // Store secret temporarily (not enabled yet)
    await update(
      'UPDATE users SET two_factor_secret = ? WHERE id = ?',
      [secret, userId]
    );
    
    res.json({
      secret,
      qrCode: qrCodeDataUrl,
      message: 'Scan the QR code with your authenticator app, then verify with a code'
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// Verify and enable 2FA
router.post('/verify-setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }
    
    // Get user's secret
    const user = await queryOne('SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = ?', [userId]);
    
    if (!user.two_factor_secret) {
      return res.status(400).json({ error: 'Please setup 2FA first' });
    }
    
    if (user.two_factor_enabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }
    
    // Verify the code
    const isValid = authenticator.verify({ token: code, secret: user.two_factor_secret });
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    // Generate backup codes
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );
    
    // Enable 2FA
    await update(
      'UPDATE users SET two_factor_enabled = TRUE, two_factor_backup_codes = ? WHERE id = ?',
      [JSON.stringify(hashedBackupCodes), userId]
    );
    
    res.json({
      message: '2FA enabled successfully',
      backupCodes,
      warning: 'Save these backup codes securely. They can only be shown once!'
    });
  } catch (error) {
    console.error('2FA verify setup error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA setup' });
  }
});

// Disable 2FA
router.post('/disable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, code } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    // Get user
    const user = await queryOne(
      'SELECT password_hash, two_factor_enabled, two_factor_secret FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user.two_factor_enabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Verify 2FA code if provided
    if (code) {
      const isValid = authenticator.verify({ token: code, secret: user.two_factor_secret });
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid 2FA code' });
      }
    }
    
    // Disable 2FA
    await update(
      'UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL, two_factor_backup_codes = NULL WHERE id = ?',
      [userId]
    );
    
    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// Verify 2FA code during login
router.post('/verify', async (req, res) => {
  try {
    const { userId, code } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({ error: 'User ID and code are required' });
    }
    
    // Get user
    const user = await queryOne(
      'SELECT id, username, email, full_name, role, phone, avatar, two_factor_secret, two_factor_backup_codes FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Try TOTP code first
    let isValid = authenticator.verify({ token: code, secret: user.two_factor_secret });
    
    // If not valid, try backup codes
    if (!isValid && user.two_factor_backup_codes) {
      const backupCodes = JSON.parse(user.two_factor_backup_codes);
      
      for (let i = 0; i < backupCodes.length; i++) {
        const codeMatch = await bcrypt.compare(code.toUpperCase(), backupCodes[i]);
        if (codeMatch) {
          // Remove used backup code
          backupCodes.splice(i, 1);
          await update(
            'UPDATE users SET two_factor_backup_codes = ? WHERE id = ?',
            [JSON.stringify(backupCodes), userId]
          );
          isValid = true;
          break;
        }
      }
    }
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    res.json({
      message: '2FA verified successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar
      },
      token
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// Get 2FA status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT two_factor_enabled FROM users WHERE id = ?',
      [req.user.id]
    );
    
    res.json({ enabled: !!user.two_factor_enabled });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

export default router;
