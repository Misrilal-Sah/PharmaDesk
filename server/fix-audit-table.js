import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixAuditLogs() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'pharmadesk',
        multipleStatements: true
    });

    try {
        console.log('Checking audit_logs table structure...');
        
        // Check current columns
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'pharmadesk' AND TABLE_NAME = 'audit_logs'
        `);
        
        const columnNames = columns.map(c => c.COLUMN_NAME);
        console.log('Current columns:', columnNames);

        // Check if we need to migrate
        if (columnNames.includes('table_name') && !columnNames.includes('entity_type')) {
            console.log('Migrating audit_logs table to new schema...');
            
            // Drop and recreate with correct schema
            await connection.query('DROP TABLE IF EXISTS audit_logs');
            
            await connection.query(`
                CREATE TABLE audit_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT,
                    user_name VARCHAR(100),
                    action VARCHAR(50) NOT NULL,
                    entity_type VARCHAR(50) NOT NULL,
                    entity_id INT,
                    entity_name VARCHAR(255),
                    old_values JSON,
                    new_values JSON,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                )
            `);
            
            // Create indexes
            await connection.query('CREATE INDEX idx_audit_user ON audit_logs(user_id)');
            await connection.query('CREATE INDEX idx_audit_action ON audit_logs(action)');
            await connection.query('CREATE INDEX idx_audit_entity ON audit_logs(entity_type)');
            await connection.query('CREATE INDEX idx_audit_date ON audit_logs(created_at)');
            
            console.log('✅ audit_logs table migrated successfully!');
        } else if (columnNames.includes('entity_type')) {
            console.log('✅ audit_logs table already has correct schema');
        } else {
            console.log('⚠️ Unexpected table structure, please check manually');
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

fixAuditLogs();
