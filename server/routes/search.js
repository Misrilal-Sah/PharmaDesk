import express from 'express';
import { query } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Global search across all entities
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({ results: [] });
    }

    const searchTerm = `%${q.trim()}%`;
    const results = [];

    // Search patients
    const patients = await query(`
      SELECT id, patient_code as code, full_name as name, 'patient' as type
      FROM patients 
      WHERE full_name LIKE ? OR patient_code LIKE ? OR phone LIKE ?
      LIMIT 5
    `, [searchTerm, searchTerm, searchTerm]);
    results.push(...patients.map(p => ({ ...p, icon: 'Users', path: '/patients' })));

    // Search doctors
    const doctors = await query(`
      SELECT id, doctor_code as code, full_name as name, 'doctor' as type
      FROM doctors 
      WHERE full_name LIKE ? OR doctor_code LIKE ? OR specialization LIKE ?
      LIMIT 5
    `, [searchTerm, searchTerm, searchTerm]);
    results.push(...doctors.map(d => ({ ...d, icon: 'Stethoscope', path: '/doctors' })));

    // Search medicines
    const medicines = await query(`
      SELECT id, medicine_code as code, name, 'medicine' as type
      FROM medicines 
      WHERE name LIKE ? OR medicine_code LIKE ? OR generic_name LIKE ?
      LIMIT 5
    `, [searchTerm, searchTerm, searchTerm]);
    results.push(...medicines.map(m => ({ ...m, icon: 'Pill', path: '/medicines' })));

    // Search prescriptions
    const prescriptions = await query(`
      SELECT p.id, p.prescription_code as code, CONCAT('Rx for ', pt.full_name) as name, 'prescription' as type
      FROM prescriptions p
      JOIN patients pt ON p.patient_id = pt.id
      WHERE p.prescription_code LIKE ? OR pt.full_name LIKE ?
      LIMIT 5
    `, [searchTerm, searchTerm]);
    results.push(...prescriptions.map(p => ({ ...p, icon: 'FileText', path: '/prescriptions' })));

    // Search invoices
    const invoices = await query(`
      SELECT s.id, s.invoice_number as code, CONCAT('Invoice - ₹', s.total_amount) as name, 'invoice' as type
      FROM sales s
      WHERE s.invoice_number LIKE ?
      LIMIT 5
    `, [searchTerm]);
    results.push(...invoices.map(i => ({ ...i, icon: 'Receipt', path: '/billing' })));

    res.json({ results: results.slice(0, 15) });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
