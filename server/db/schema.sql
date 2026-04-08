-- Create Database
CREATE DATABASE IF NOT EXISTS pharmadesk;
USE pharmadesk;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar VARCHAR(255),
  role ENUM('Admin', 'Pharmacist', 'Doctor', 'Staff') DEFAULT 'Staff',
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  google_id VARCHAR(255),
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  two_factor_backup_codes JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Medicines Table
CREATE TABLE IF NOT EXISTS medicines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  medicine_code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255),
  category_id INT NOT NULL,
  manufacturer VARCHAR(255),
  strength VARCHAR(100),
  formulation VARCHAR(100),
  unit_price DECIMAL(10, 2) NOT NULL,
  reorder_level INT DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  INDEX idx_medicine_code (medicine_code),
  INDEX idx_name (name),
  INDEX idx_category_id (category_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_phone (phone),
  INDEX idx_email (email),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Batches Table
CREATE TABLE IF NOT EXISTS batches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  medicine_id INT NOT NULL,
  batch_number VARCHAR(100) NOT NULL,
  supplier_id INT,
  quantity INT NOT NULL,
  remaining_quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  expiry_date DATE NOT NULL,
  manufacturing_date DATE,
  received_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  INDEX idx_medicine_id (medicine_id),
  INDEX idx_batch_number (batch_number),
  INDEX idx_expiry_date (expiry_date),
  INDEX idx_remaining_quantity (remaining_quantity),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventory Transactions Table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  medicine_id INT NOT NULL,
  batch_id INT,
  transaction_type ENUM('Purchase', 'Sale', 'Adjustment', 'Discard') NOT NULL,
  quantity INT NOT NULL,
  reference_id INT,
  performed_by INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_medicine_id (medicine_id),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_created_at (created_at),
  INDEX idx_performed_by (performed_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  doctor_code VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  specialization VARCHAR(255),
  license_number VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  hospital_affiliation VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_doctor_code (doctor_code),
  INDEX idx_license_number (license_number),
  INDEX idx_full_name (full_name),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patient_code VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender ENUM('Male', 'Female', 'Other'),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(20),
  medical_history TEXT,
  allergies TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_patient_code (patient_code),
  INDEX idx_full_name (full_name),
  INDEX idx_phone (phone),
  INDEX idx_email (email),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patient_id INT NOT NULL,
  doctor_id INT,
  prescribed_by INT NOT NULL,
  prescribed_date DATE NOT NULL,
  medicine_id INT NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  duration INT NOT NULL,
  duration_unit ENUM('Days', 'Weeks', 'Months') DEFAULT 'Days',
  instructions TEXT,
  status ENUM('Pending', 'Dispensed', 'Completed', 'Expired') DEFAULT 'Pending',
  dispensed_date DATE,
  dispensed_by INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  FOREIGN KEY (prescribed_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT,
  FOREIGN KEY (dispensed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_patient_id (patient_id),
  INDEX idx_doctor_id (doctor_id),
  INDEX idx_medicine_id (medicine_id),
  INDEX idx_status (status),
  INDEX idx_prescribed_date (prescribed_date),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sales Table
CREATE TABLE IF NOT EXISTS sales (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  patient_id INT,
  prescription_id INT,
  sold_by INT NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(12, 2) NOT NULL,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  payment_method ENUM('Cash', 'Card', 'UPI', 'Check') DEFAULT 'Cash',
  payment_status ENUM('Pending', 'Completed', 'Failed') DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE SET NULL,
  FOREIGN KEY (sold_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_invoice_number (invoice_number),
  INDEX idx_patient_id (patient_id),
  INDEX idx_sold_by (sold_by),
  INDEX idx_created_at (created_at),
  INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sale Items Table
CREATE TABLE IF NOT EXISTS sale_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sale_id INT NOT NULL,
  medicine_id INT NOT NULL,
  batch_id INT,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT,
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
  INDEX idx_sale_id (sale_id),
  INDEX idx_medicine_id (medicine_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  message TEXT NOT NULL,
  category VARCHAR(50),
  reference_id INT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  user_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_entity_type (entity_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verification Tokens Table
CREATE TABLE IF NOT EXISTS verification_tokens (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  device_info VARCHAR(255),
  browser VARCHAR(100),
  os VARCHAR(100),
  ip_address VARCHAR(45),
  is_active BOOLEAN DEFAULT TRUE,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token_hash (token_hash),
  INDEX idx_is_active (is_active),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shortcuts Table
CREATE TABLE IF NOT EXISTS shortcuts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  key_combination VARCHAR(100) NOT NULL,
  action VARCHAR(255) NOT NULL,
  description TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_key_combination (key_combination)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
