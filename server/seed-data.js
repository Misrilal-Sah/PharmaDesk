import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function seedDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🌱 Seeding database with dummy data...\n');

    // Check if categories exist, if not insert them
    const [existingCats] = await connection.execute('SELECT COUNT(*) as count FROM categories');
    if (existingCats[0].count === 0) {
      console.log('📁 Adding categories...');
      await connection.execute(`
        INSERT INTO categories (name, description) VALUES
        ('Antibiotics', 'Medications used to treat bacterial infections'),
        ('Analgesics', 'Pain relievers and fever reducers'),
        ('Antacids', 'Medications for stomach acid and digestion'),
        ('Antihistamines', 'Allergy medications'),
        ('Cardiovascular', 'Heart and blood pressure medications'),
        ('Diabetes', 'Insulin and diabetes management drugs'),
        ('Vitamins', 'Vitamin supplements and multivitamins'),
        ('Dermatology', 'Skin care medications'),
        ('Respiratory', 'Medications for breathing and lung conditions'),
        ('General', 'General purpose medications')
      `);
    }

    // Create additional users
    console.log('👤 Adding users...');
    const pharmacistHash = await bcrypt.hash('pharma123', 10);
    const doctorHash = await bcrypt.hash('doctor123', 10);
    const staffHash = await bcrypt.hash('staff123', 10);

    await connection.execute(`
      INSERT IGNORE INTO users (username, email, password_hash, full_name, role, phone) VALUES
      ('pharmacist', 'pharmacist@pharmadesk.com', ?, 'John Pharmacist', 'Pharmacist', '9876543210'),
      ('doctor', 'doctor@pharmadesk.com', ?, 'Dr. Sarah Smith', 'Doctor', '9876543211'),
      ('staff', 'staff@pharmadesk.com', ?, 'Mike Staff', 'Staff', '9876543212')
    `, [pharmacistHash, doctorHash, staffHash]);

    // Add suppliers
    console.log('🏭 Adding suppliers...');
    await connection.execute(`
      INSERT IGNORE INTO suppliers (name, contact_person, phone, email, address) VALUES
      ('MedSupply Co.', 'Rajesh Kumar', '9123456789', 'rajesh@medsupply.com', 'Mumbai, Maharashtra'),
      ('PharmaCare Ltd.', 'Priya Sharma', '9234567890', 'priya@pharmacare.com', 'Delhi, India'),
      ('HealthFirst Distributors', 'Amit Patel', '9345678901', 'amit@healthfirst.com', 'Ahmedabad, Gujarat'),
      ('Medicare Supplies', 'Sunita Reddy', '9456789012', 'sunita@medicare.com', 'Hyderabad, Telangana')
    `);

    // Add patients
    console.log('👥 Adding patients...');
    await connection.execute(`
      INSERT IGNORE INTO patients (patient_code, full_name, date_of_birth, gender, phone, email, address, blood_group, allergies) VALUES
      ('PAT001', 'Rahul Sharma', '1990-05-15', 'Male', '9876543001', 'rahul@email.com', '123 Main Street, Mumbai', 'O+', 'Penicillin'),
      ('PAT002', 'Priya Patel', '1985-08-22', 'Female', '9876543002', 'priya@email.com', '456 Oak Avenue, Delhi', 'A+', NULL),
      ('PAT003', 'Amit Kumar', '1978-12-10', 'Male', '9876543003', 'amit@email.com', '789 Park Road, Bangalore', 'B+', 'Aspirin'),
      ('PAT004', 'Sneha Reddy', '1995-03-28', 'Female', '9876543004', 'sneha@email.com', '321 Lake View, Chennai', 'AB+', NULL),
      ('PAT005', 'Vikram Singh', '1982-07-14', 'Male', '9876543005', 'vikram@email.com', '654 Hill Top, Pune', 'O-', 'Sulfa drugs'),
      ('PAT006', 'Anita Gupta', '1988-11-05', 'Female', '9876543006', 'anita@email.com', '987 River Side, Kolkata', 'A-', NULL),
      ('PAT007', 'Suresh Nair', '1975-09-20', 'Male', '9876543007', 'suresh@email.com', '159 Garden City, Kochi', 'B-', NULL),
      ('PAT008', 'Kavita Joshi', '1992-02-18', 'Female', '9876543008', 'kavita@email.com', '753 Tech Park, Hyderabad', 'AB-', 'Ibuprofen')
    `);

    // Add doctors
    console.log('🩺 Adding doctors...');
    await connection.execute(`
      INSERT IGNORE INTO doctors (doctor_code, full_name, specialization, license_number, phone, email, hospital_affiliation) VALUES
      ('DOC001', 'Dr. Arun Mehta', 'General Physician', 'MH12345', '9988776601', 'arun.mehta@hospital.com', 'City Hospital'),
      ('DOC002', 'Dr. Meera Krishnan', 'Cardiologist', 'KA23456', '9988776602', 'meera.k@hospital.com', 'Heart Care Center'),
      ('DOC003', 'Dr. Ravi Shankar', 'Orthopedic', 'TN34567', '9988776603', 'ravi.s@hospital.com', 'Bone & Joint Clinic'),
      ('DOC004', 'Dr. Pooja Verma', 'Dermatologist', 'DL45678', '9988776604', 'pooja.v@hospital.com', 'Skin Care Hospital'),
      ('DOC005', 'Dr. Kiran Desai', 'Pediatrician', 'GJ56789', '9988776605', 'kiran.d@hospital.com', 'Children Hospital')
    `);

    // Add medicines
    console.log('💊 Adding medicines...');
    await connection.execute(`
      INSERT IGNORE INTO medicines (medicine_code, name, generic_name, category_id, manufacturer, dosage_form, strength, unit_price, selling_price, reorder_level, requires_prescription) VALUES
      ('MED001', 'Paracetamol 500mg', 'Acetaminophen', 2, 'Cipla Ltd', 'Tablet', '500mg', 1.50, 2.00, 100, FALSE),
      ('MED002', 'Amoxicillin 250mg', 'Amoxicillin', 1, 'Sun Pharma', 'Capsule', '250mg', 5.00, 8.00, 50, TRUE),
      ('MED003', 'Cetirizine 10mg', 'Cetirizine', 4, 'Dr. Reddy', 'Tablet', '10mg', 2.00, 3.50, 80, FALSE),
      ('MED004', 'Omeprazole 20mg', 'Omeprazole', 3, 'Lupin', 'Capsule', '20mg', 4.00, 6.00, 60, FALSE),
      ('MED005', 'Metformin 500mg', 'Metformin', 6, 'Cipla Ltd', 'Tablet', '500mg', 3.00, 5.00, 100, TRUE),
      ('MED006', 'Atorvastatin 10mg', 'Atorvastatin', 5, 'Sun Pharma', 'Tablet', '10mg', 8.00, 12.00, 40, TRUE),
      ('MED007', 'Vitamin C 500mg', 'Ascorbic Acid', 7, 'Himalaya', 'Tablet', '500mg', 1.00, 2.00, 200, FALSE),
      ('MED008', 'Aspirin 75mg', 'Aspirin', 2, 'Bayer', 'Tablet', '75mg', 2.00, 3.00, 100, FALSE),
      ('MED009', 'Azithromycin 500mg', 'Azithromycin', 1, 'Zydus', 'Tablet', '500mg', 25.00, 35.00, 30, TRUE),
      ('MED010', 'Salbutamol Inhaler', 'Salbutamol', 9, 'Cipla Ltd', 'Inhaler', '100mcg', 80.00, 120.00, 20, TRUE),
      ('MED011', 'Ibuprofen 400mg', 'Ibuprofen', 2, 'Abbott', 'Tablet', '400mg', 2.50, 4.00, 100, FALSE),
      ('MED012', 'Clopidogrel 75mg', 'Clopidogrel', 5, 'Sun Pharma', 'Tablet', '75mg', 10.00, 15.00, 50, TRUE),
      ('MED013', 'Pantoprazole 40mg', 'Pantoprazole', 3, 'Alkem', 'Tablet', '40mg', 5.00, 8.00, 60, FALSE),
      ('MED014', 'Multivitamin', 'Multiple Vitamins', 7, 'Revital', 'Capsule', '-', 3.00, 5.00, 100, FALSE),
      ('MED015', 'Betadine Ointment', 'Povidone-iodine', 8, 'Win Medicare', 'Ointment', '5%', 40.00, 60.00, 25, FALSE)
    `);

    // Add batches (inventory)
    console.log('📦 Adding inventory batches...');
    const futureDate1 = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 year
    const futureDate2 = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 6 months
    const futureDate3 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days (expiring soon)
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // expired

    await connection.execute(`
      INSERT IGNORE INTO batches (medicine_id, batch_number, supplier_id, quantity, remaining_quantity, purchase_price, expiry_date) VALUES
      (1, 'PCM-2024-001', 1, 500, 450, 1.20, ?),
      (1, 'PCM-2024-002', 2, 300, 300, 1.25, ?),
      (2, 'AMX-2024-001', 1, 200, 180, 4.00, ?),
      (3, 'CTZ-2024-001', 3, 400, 350, 1.60, ?),
      (4, 'OMP-2024-001', 2, 150, 120, 3.20, ?),
      (5, 'MTF-2024-001', 1, 300, 250, 2.40, ?),
      (6, 'ATV-2024-001', 4, 100, 80, 6.50, ?),
      (7, 'VTC-2024-001', 3, 500, 400, 0.80, ?),
      (8, 'ASP-2024-001', 2, 400, 350, 1.60, ?),
      (9, 'AZT-2024-001', 1, 50, 40, 20.00, ?),
      (10, 'SBT-2024-001', 4, 30, 25, 65.00, ?),
      (11, 'IBP-2024-001', 1, 200, 5, 2.00, ?),
      (12, 'CLP-2024-001', 2, 80, 60, 8.00, ?),
      (13, 'PNT-2024-001', 3, 150, 130, 4.00, ?),
      (14, 'MTV-2024-001', 4, 200, 150, 2.40, ?),
      (15, 'BTD-2024-001', 1, 50, 40, 32.00, ?)
    `, [
      futureDate1, futureDate2, futureDate1, futureDate1, futureDate2,
      futureDate1, futureDate1, futureDate1, futureDate3, futureDate1,
      futureDate2, futureDate3, futureDate1, futureDate1, futureDate2, futureDate1
    ]);

    // Add prescriptions
    console.log('📋 Adding prescriptions...');
    await connection.execute(`
      INSERT IGNORE INTO prescriptions (prescription_code, patient_id, doctor_id, diagnosis, notes, status) VALUES
      ('RX001', 1, 1, 'Common Cold and Fever', 'Rest and drink plenty of fluids', 'Dispensed'),
      ('RX002', 2, 2, 'Hypertension', 'Monitor blood pressure daily', 'Pending'),
      ('RX003', 3, 1, 'Allergic Rhinitis', 'Avoid dust and allergens', 'Dispensed'),
      ('RX004', 4, 3, 'Lower Back Pain', 'Physical therapy recommended', 'Pending'),
      ('RX005', 5, 1, 'Type 2 Diabetes', 'Diet control and exercise', 'Dispensed')
    `);

    // Add prescription items
    console.log('📝 Adding prescription items...');
    await connection.execute(`
      INSERT IGNORE INTO prescription_items (prescription_id, medicine_id, quantity, dosage, frequency, duration, is_dispensed) VALUES
      (1, 1, 10, '1 tablet', 'Three times daily', '3 days', TRUE),
      (1, 3, 5, '1 tablet', 'Once daily at night', '5 days', TRUE),
      (2, 6, 30, '1 tablet', 'Once daily', '30 days', FALSE),
      (2, 12, 30, '1 tablet', 'Once daily', '30 days', FALSE),
      (3, 3, 10, '1 tablet', 'Once daily', '10 days', TRUE),
      (4, 11, 15, '1 tablet', 'Twice daily', '7 days', FALSE),
      (5, 5, 60, '1 tablet', 'Twice daily', '30 days', TRUE)
    `);

    // Get admin user id for sales
    const [adminUser] = await connection.execute('SELECT id FROM users WHERE username = ?', ['admin']);
    const adminId = adminUser[0]?.id || 1;

    // Add sales
    console.log('💰 Adding sales...');
    await connection.execute(`
      INSERT IGNORE INTO sales (invoice_number, patient_id, prescription_id, subtotal, tax_amount, discount_amount, total_amount, payment_method, payment_status, sold_by) VALUES
      ('INV-2024-001', 1, 1, 35.00, 0, 0, 35.00, 'Cash', 'Paid', ?),
      ('INV-2024-002', 3, 3, 35.00, 0, 5.00, 30.00, 'UPI', 'Paid', ?),
      ('INV-2024-003', 5, 5, 300.00, 0, 20.00, 280.00, 'Card', 'Paid', ?),
      ('INV-2024-004', NULL, NULL, 50.00, 0, 0, 50.00, 'Cash', 'Paid', ?),
      ('INV-2024-005', 2, NULL, 120.00, 0, 0, 120.00, 'UPI', 'Pending', ?)
    `, [adminId, adminId, adminId, adminId, adminId]);

    // Add sale items
    console.log('🛒 Adding sale items...');
    await connection.execute(`
      INSERT IGNORE INTO sale_items (sale_id, medicine_id, batch_id, quantity, unit_price, total_price) VALUES
      (1, 1, 1, 10, 2.00, 20.00),
      (1, 3, 4, 5, 3.00, 15.00),
      (2, 3, 4, 10, 3.50, 35.00),
      (3, 5, 6, 60, 5.00, 300.00),
      (4, 7, 8, 10, 2.00, 20.00),
      (4, 14, 15, 10, 3.00, 30.00),
      (5, 6, 7, 10, 12.00, 120.00)
    `);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('   - 4 Users (admin, pharmacist, doctor, staff)');
    console.log('   - 4 Suppliers');
    console.log('   - 8 Patients');
    console.log('   - 5 Doctors');
    console.log('   - 15 Medicines');
    console.log('   - 16 Inventory Batches');
    console.log('   - 5 Prescriptions');
    console.log('   - 5 Sales');

    console.log('\n🔐 Login Credentials:');
    console.log('   admin / admin123');
    console.log('   pharmacist / pharma123');
    console.log('   doctor / doctor123');
    console.log('   staff / staff123');

  } catch (error) {
    console.error('Error seeding database:', error.message);
  } finally {
    await connection.end();
  }
}

seedDatabase();
