import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import patientRoutes from './routes/patients.js';
import doctorRoutes from './routes/doctors.js';
import medicineRoutes from './routes/medicines.js';
import inventoryRoutes from './routes/inventory.js';
import prescriptionRoutes from './routes/prescriptions.js';
import billingRoutes from './routes/billing.js';
import reportRoutes from './routes/reports.js';
import categoryRoutes from './routes/categories.js';
import supplierRoutes from './routes/suppliers.js';
import searchRoutes from './routes/search.js';
import notificationRoutes from './routes/notifications.js';
import shortcutRoutes from './routes/shortcuts.js';
import auditRoutes from './routes/audit.js';
import sessionRoutes from './routes/sessions.js';
import twoFactorRoutes from './routes/twoFactor.js';
import uploadRoutes from './routes/upload.js';
import { scheduleExpiryAlerts } from './services/expiryAlerts.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

function normalizeOrigin(origin = '') {
    const trimmed = String(origin).trim().replace(/\/+$/, '');
    if (!trimmed) return '';

    try {
        const parsed = new URL(trimmed);
        return `${parsed.protocol}//${parsed.host}`.toLowerCase();
    } catch (error) {
        return trimmed.toLowerCase();
    }
}

const configuredOrigins = [
    ...(process.env.CORS_ORIGINS || '').split(','),
    process.env.FRONTEND_URL || ''
]
    .map(origin => normalizeOrigin(origin))
    .filter(Boolean);

const allowedOrigins = new Set(configuredOrigins);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser tools and same-origin server calls with no Origin header.
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.size === 0) {
            return callback(null, true);
        }

        const normalizedOrigin = normalizeOrigin(origin);
        if (allowedOrigins.has(normalizedOrigin)) {
            return callback(null, true);
        }

        return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' })); // allow base64 image uploads

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/shortcuts', shortcutRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'PharmaDesk API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
initDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 PharmaDesk server running on http://localhost:${PORT}`);

            // Start scheduled tasks
            scheduleExpiryAlerts();
        });
    })
    .catch(err => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });
