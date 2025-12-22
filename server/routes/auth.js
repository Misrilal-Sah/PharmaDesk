import express from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, insert, update } from '../db/database.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { createSession, invalidateSession } from './sessions.js';
import { 
  generateOTP, 
  generateToken as generateVerificationToken,
  sendVerificationEmail, 
  sendPasswordResetEmail,
  sendEmailChangeOTP 
} from '../services/email.js';

const router = express.Router();

// Register new user (Step 1: Send OTP)
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, full_name, role, phone } = req.body;

        if (!username || !email || !password || !full_name) {
            return res.status(400).json({ error: 'Username, email, password, and full name are required' });
        }

        // Check if user exists
        const existingUser = await queryOne(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Insert user (unverified)
        const userId = await insert(
            `INSERT INTO users (username, email, password_hash, full_name, role, phone, is_verified, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, FALSE, FALSE)`,
            [username, email, password_hash, full_name, role || 'Staff', phone || null]
        );

        // Generate OTP and save
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await insert(
            `INSERT INTO verification_tokens (user_id, email, otp, type, expires_at) VALUES (?, ?, ?, 'signup', ?)`,
            [userId, email, otp, expiresAt]
        );

        // Send verification email
        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            // If email fails, log OTP to console for testing
            console.log(`📧 Verification OTP for ${email}: ${otp}`);
        }

        res.status(201).json({ 
            message: 'Verification code sent to your email',
            userId,
            email,
            requiresVerification: true
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Verify OTP for signup
router.post('/verify-signup', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        // Find valid token
        const token = await queryOne(
            `SELECT * FROM verification_tokens 
             WHERE email = ? AND otp = ? AND type = 'signup' 
             AND used = FALSE AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [email, otp]
        );

        if (!token) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }

        // Mark token as used
        await update('UPDATE verification_tokens SET used = TRUE WHERE id = ?', [token.id]);

        // Activate user
        await update('UPDATE users SET is_verified = TRUE, is_active = TRUE WHERE id = ?', [token.user_id]);

        // Get user and generate login token
        const user = await queryOne('SELECT id, username, email, full_name, role FROM users WHERE id = ?', [token.user_id]);
        const authToken = generateToken(user);

        res.json({ 
            message: 'Email verified successfully',
            user,
            token: authToken 
        });
    } catch (error) {
        console.error('Verify signup error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Resend verification OTP
router.post('/resend-otp', async (req, res) => {
    try {
        const { email, type = 'signup' } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Generate new OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Get user
        const user = await queryOne('SELECT id FROM users WHERE email = ?', [email]);

        if (!user) {
            return res.status(404).json({ error: 'Email not found' });
        }

        // Invalidate old tokens
        await update(
            `UPDATE verification_tokens SET used = TRUE WHERE email = ? AND type = ? AND used = FALSE`,
            [email, type]
        );

        // Create new token
        await insert(
            `INSERT INTO verification_tokens (user_id, email, otp, type, expires_at) VALUES (?, ?, ?, ?, ?)`,
            [user.id, email, otp, type, expiresAt]
        );

        // Send email
        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            console.log(`📧 Resend OTP for ${email}: ${otp}`);
        }

        res.json({ message: 'Verification code resent' });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ error: 'Failed to resend code' });
    }
});

// Forgot Password - Step 1: Send OTP
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await queryOne('SELECT id, email FROM users WHERE email = ?', [email]);

        if (!user) {
            // Don't reveal if email exists
            return res.json({ message: 'If this email exists, a reset code has been sent' });
        }

        // Generate OTP and token
        const otp = generateOTP();
        const token = generateVerificationToken();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Invalidate old tokens
        await update(
            `UPDATE verification_tokens SET used = TRUE WHERE user_id = ? AND type = 'password_reset' AND used = FALSE`,
            [user.id]
        );

        // Save token
        await insert(
            `INSERT INTO verification_tokens (user_id, email, token, otp, type, expires_at) VALUES (?, ?, ?, ?, 'password_reset', ?)`,
            [user.id, email, token, otp, expiresAt]
        );

        // Send email
        const emailSent = await sendPasswordResetEmail(email, token, otp);

        if (!emailSent) {
            console.log(`📧 Password Reset OTP for ${email}: ${otp}`);
        }

        res.json({ message: 'If this email exists, a reset code has been sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Reset Password - Step 2: Verify OTP and set new password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'Email, OTP, and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Find valid token
        const token = await queryOne(
            `SELECT * FROM verification_tokens 
             WHERE email = ? AND otp = ? AND type = 'password_reset' 
             AND used = FALSE AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [email, otp]
        );

        if (!token) {
            return res.status(400).json({ error: 'Invalid or expired reset code' });
        }

        // Mark token as used
        await update('UPDATE verification_tokens SET used = TRUE WHERE id = ?', [token.id]);

        // Update password
        const password_hash = await bcrypt.hash(newPassword, 10);
        await update('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, token.user_id]);

        res.json({ message: 'Password reset successful. You can now login.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user
        const user = await queryOne(
            'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = TRUE',
            [username, username]
        );

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if 2FA is enabled
        if (user.two_factor_enabled) {
            // Return partial response, require 2FA verification
            return res.json({
                requires2FA: true,
                userId: user.id,
                message: 'Please enter your 2FA code'
            });
        }

        // Generate token
        const token = generateToken(user);

        // Create session record
        try {
            await createSession(user.id, token, req);
        } catch (sessionError) {
            console.error('Failed to create session record:', sessionError);
            // Continue login even if session creation fails
        }

        res.json({
            message: 'Login successful',
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
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await queryOne(
            'SELECT id, username, email, full_name, role, phone, avatar FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Import permissions dynamically to avoid circular dependency
        const { getRolePermissions } = await import('../middleware/permissions.js');
        
        res.json({
            ...user,
            permissions: getRolePermissions(user.role)
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        const user = await queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);

        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Request email change
router.post('/request-email-change', authenticateToken, async (req, res) => {
    try {
        const { newEmail, password } = req.body;

        if (!newEmail || !password) {
            return res.status(400).json({ error: 'New email and password are required' });
        }

        // Verify password
        const user = await queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Password is incorrect' });
        }

        // Check if email already exists
        const existing = await queryOne('SELECT id FROM users WHERE email = ?', [newEmail]);
        if (existing) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await insert(
            `INSERT INTO verification_tokens (user_id, email, otp, type, expires_at) VALUES (?, ?, ?, 'email_change', ?)`,
            [req.user.id, newEmail, otp, expiresAt]
        );

        // Send email
        const emailSent = await sendEmailChangeOTP(newEmail, otp);

        if (!emailSent) {
            console.log(`📧 Email Change OTP for ${newEmail}: ${otp}`);
        }

        res.json({ message: 'Verification code sent to new email' });
    } catch (error) {
        console.error('Request email change error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Verify email change
router.post('/verify-email-change', authenticateToken, async (req, res) => {
    try {
        const { newEmail, otp } = req.body;

        if (!newEmail || !otp) {
            return res.status(400).json({ error: 'New email and OTP are required' });
        }

        // Find valid token
        const token = await queryOne(
            `SELECT * FROM verification_tokens 
             WHERE user_id = ? AND email = ? AND otp = ? AND type = 'email_change' 
             AND used = FALSE AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [req.user.id, newEmail, otp]
        );

        if (!token) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }

        // Mark token as used
        await update('UPDATE verification_tokens SET used = TRUE WHERE id = ?', [token.id]);

        // Update email
        await update('UPDATE users SET email = ? WHERE id = ?', [newEmail, req.user.id]);

        res.json({ message: 'Email updated successfully' });
    } catch (error) {
        console.error('Verify email change error:', error);
        res.status(500).json({ error: 'Email change failed' });
    }
});

export default router;
