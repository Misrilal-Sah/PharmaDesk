import express from 'express';
import crypto from 'crypto';
import { query, queryOne } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get current user's active sessions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentTokenHash = hashToken(req.headers.authorization?.split(' ')[1] || '');

    const sessions = await query(
      `SELECT id, device_info, browser, os, ip_address, last_active, created_at,
              (token_hash = ?) as is_current
       FROM user_sessions 
       WHERE user_id = ? AND is_active = TRUE
       ORDER BY last_active DESC`,
      [currentTokenHash, userId]
    );

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Revoke a specific session
router.delete('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    await query(
      `UPDATE user_sessions SET is_active = FALSE WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );

    res.json({ message: 'Session revoked' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// Revoke all other sessions (keep current)
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentTokenHash = hashToken(req.headers.authorization?.split(' ')[1] || '');

    await query(
      `UPDATE user_sessions SET is_active = FALSE 
       WHERE user_id = ? AND token_hash != ?`,
      [userId, currentTokenHash]
    );

    res.json({ message: 'All other sessions revoked' });
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
});

// Helper function to hash tokens
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Export helper functions for use in auth routes
export function createSession(userId, token, req) {
  const tokenHash = hashToken(token);
  const userAgent = req.get('User-Agent') || '';
  const ipAddress = req.ip || req.connection?.remoteAddress;
  
  // Parse user agent for device info
  const deviceInfo = parseUserAgent(userAgent);
  
  // Calculate expiry (7 days from now)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return query(
    `INSERT INTO user_sessions (user_id, token_hash, device_info, browser, os, ip_address, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, tokenHash, deviceInfo.device, deviceInfo.browser, deviceInfo.os, ipAddress, expiresAt]
  );
}

export function invalidateSession(token) {
  const tokenHash = hashToken(token);
  return query(
    `UPDATE user_sessions SET is_active = FALSE WHERE token_hash = ?`,
    [tokenHash]
  );
}

export function updateSessionActivity(token) {
  const tokenHash = hashToken(token);
  return query(
    `UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP WHERE token_hash = ?`,
    [tokenHash]
  );
}

function parseUserAgent(ua) {
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  // Detect browser
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'Internet Explorer';

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Detect device type
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) device = 'Mobile';
  else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet';

  return { browser, os, device };
}

export default router;
