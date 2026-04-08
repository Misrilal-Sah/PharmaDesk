import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabaseName, getMySqlConnectionConfig, getMySqlPoolConfig } from './mysqlConfig.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseName = getDatabaseName();

function getSchemaStatements(schemaContent) {
    // schema.sql contains CREATE DATABASE / USE for local workflows; skip those for managed DB services.
    const cleanedSchema = schemaContent
        .replace(/^\s*CREATE\s+DATABASE\b[^;]*;?\s*$/gim, '')
        .replace(/^\s*USE\s+[^;]*;?\s*$/gim, '');

    return cleanedSchema
        .split(';')
        .map(statement => statement.trim())
        .filter(Boolean);
}

// Create connection pool
const pool = mysql.createPool(getMySqlPoolConfig());

// Initialize database
export async function initDatabase() {
    try {
        const connection = await mysql.createConnection(
            getMySqlConnectionConfig({ includeDatabase: true, multipleStatements: true })
        );

        // Read and execute schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split and execute statements
        const statements = getSchemaStatements(schema);
        for (const statement of statements) {
            try {
                await connection.query(statement);
            } catch (err) {
                // Ignore duplicate entry errors for initial data
                if (!err.message.includes('Duplicate entry') && !err.message.includes('already exists')) {
                    console.log('SQL Warning:', err.message);
                }
            }
        }

        // Run migrations to add new columns to existing tables
        await runMigrations(connection);

        await connection.end();
        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
        throw error;
    }
}

// Run database migrations for new columns
async function runMigrations(connection) {
    const migrations = [
        // Verification tokens table migration
        `CREATE TABLE IF NOT EXISTS verification_tokens (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            email VARCHAR(100) NOT NULL,
            token VARCHAR(255),
            otp VARCHAR(10),
            type VARCHAR(50) NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_verification_email_type (email, type),
            INDEX idx_verification_token (token),
            INDEX idx_verification_otp (otp),
            INDEX idx_verification_expiry (expires_at),
            INDEX idx_verification_used (used)
        )`,
        // Notifications table migrations
        `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category VARCHAR(50)`,
        `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id INT`,
        // Users table migrations
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSON`,
    ];

    for (const sql of migrations) {
        try {
            await connection.query(sql);
        } catch (err) {
            // Ignore if column already exists or syntax not supported
            if (!err.message.includes('Duplicate column') && !err.message.includes('already exists')) {
                // Try alternative syntax for MySQL versions that don't support IF NOT EXISTS
                const columnMatch = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/);
                if (columnMatch) {
                    const columnName = columnMatch[1];
                    const tableName = sql.match(/ALTER TABLE (\w+)/)[1];
                    try {
                        // Check if column exists
                        const [cols] = await connection.query(
                            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                            [databaseName, tableName, columnName]
                        );
                        if (cols.length === 0) {
                            // Column doesn't exist, add it
                            const addSql = sql.replace(' IF NOT EXISTS', '');
                            await connection.query(addSql);
                        }
                    } catch (innerErr) {
                        // Silently ignore
                    }
                }
            }
        }
    }
}

// Execute query helper - using query() instead of execute() for better LIMIT/OFFSET compatibility
export async function query(sql, params = []) {
    const [results] = await pool.query(sql, params);
    return results;
}

// Get single row
export async function queryOne(sql, params = []) {
    const results = await query(sql, params);
    return results[0] || null;
}

// Insert and return inserted ID
export async function insert(sql, params = []) {
    const [result] = await pool.query(sql, params);
    return result.insertId;
}

// Update and return affected rows
export async function update(sql, params = []) {
    const [result] = await pool.query(sql, params);
    return result.affectedRows;
}

// Delete and return affected rows
export async function remove(sql, params = []) {
    const [result] = await pool.query(sql, params);
    return result.affectedRows;
}

export default pool;