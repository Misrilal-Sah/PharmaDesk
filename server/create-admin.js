import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function createAdmin() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Generate proper password hash
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    
    // Delete existing admin if exists
    await connection.execute('DELETE FROM users WHERE username = ?', ['admin']);
    
    // Insert admin with correct hash
    await connection.execute(
      'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
      ['admin', 'admin@pharmadesk.com', hash, 'System Administrator', 'Admin']
    );
    
    console.log('✅ Admin user created successfully!');
    console.log('   Username: admin');
    console.log('   Password: admin123');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

createAdmin();
