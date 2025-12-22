import { useState, useEffect } from 'react';
import { medicinesAPI, categoriesAPI } from '../services/api';
import { useToast } from '../components/Toast/Toast';
import { useConfirm } from '../components/ConfirmModal/ConfirmModal';
import { TableSkeleton } from '../components/Skeleton/Skeleton';
import ExportButton from '../components/ExportButton/ExportButton';
import { Search, Plus, Edit, Trash2, X, Pill } from 'lucide-react';

export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [formData, setFormData] = useState({
    name: '', generic_name: '', category_id: '', manufacturer: '', dosage_form: 'Tablet',
    strength: '', unit_price: '', selling_price: '', reorder_level: 10, requires_prescription: false, description: ''
  });
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => { fetchData(); }, [search]);

  const fetchData = async () => {
    try {
      const [medsRes, catsRes] = await Promise.all([
        medicinesAPI.getAll({ search }),
        categoriesAPI.getAll()
      ]);
      setMedicines(medsRes.data.medicines || []);
      setCategories(catsRes.data || []);
    } catch (error) {
      toast.error('Failed to fetch medicines');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, unit_price: parseFloat(formData.unit_price), selling_price: parseFloat(formData.selling_price) };
      if (editingMedicine) {
        await medicinesAPI.update(editingMedicine.id, data);
        toast.success('Medicine updated successfully!');
      } else {
        await medicinesAPI.create(data);
        toast.success('Medicine added successfully!');
      }
      setShowModal(false); setEditingMedicine(null); resetForm(); fetchData();
    } catch (error) { toast.error(error.response?.data?.error || 'Operation failed'); }
  };

  const handleEdit = (med) => {
    setEditingMedicine(med);
    setFormData({
      name: med.name || '', generic_name: med.generic_name || '', category_id: med.category_id || '',
      manufacturer: med.manufacturer || '', dosage_form: med.dosage_form || 'Tablet', strength: med.strength || '',
      unit_price: med.unit_price || '', selling_price: med.selling_price || '', reorder_level: med.reorder_level || 10,
      requires_prescription: med.requires_prescription || false, description: med.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Medicine',
      message: 'Are you sure you want to delete this medicine?',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    try { 
      await medicinesAPI.delete(id); 
      toast.success('Medicine deleted!');
      fetchData(); 
    } catch (error) { toast.error(error.response?.data?.error || 'Delete failed'); }
  };

  const resetForm = () => {
    setFormData({ name: '', generic_name: '', category_id: '', manufacturer: '', dosage_form: 'Tablet',
      strength: '', unit_price: '', selling_price: '', reorder_level: 10, requires_prescription: false, description: '' });
  };

  const dosageForms = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Powder', 'Other'];

  const exportColumns = [
    { key: 'medicine_code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'generic_name', label: 'Generic Name' },
    { key: 'category_name', label: 'Category' },
    { key: 'dosage_form', label: 'Form' },
    { key: 'strength', label: 'Strength' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'total_stock', label: 'Stock' },
    { key: 'unit_price', label: 'Unit Price' },
    { key: 'selling_price', label: 'Selling Price' }
  ];

  return (
    <div>
      <div className="page-header">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Search medicines..." className="form-input" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-sm">
          <ExportButton data={medicines} filename="medicines" columns={exportColumns} />
          <button className="btn btn-primary" onClick={() => { resetForm(); setEditingMedicine(null); setShowModal(true); }}>
            <Plus size={18} /> Add Medicine
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Code</th><th>Name</th><th>Category</th><th>Form</th><th>Stock</th><th>Price</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {medicines.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center" style={{ padding: '3rem' }}>
                    <Pill size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <p className="text-muted">No medicines found</p>
                    <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowModal(true); }} style={{ marginTop: '0.5rem' }}>
                      <Plus size={16} /> Add First Medicine
                    </button>
                  </td>
                </tr>
              ) : medicines.map((med) => (
                <tr key={med.id}>
                  <td><span className="badge badge-primary">{med.medicine_code}</span></td>
                  <td>
                    <div><strong>{med.name}</strong></div>
                    {med.generic_name && <div className="text-sm text-muted">{med.generic_name}</div>}
                  </td>
                  <td>{med.category_name || '-'}</td>
                  <td>{med.dosage_form}</td>
                  <td>
                    <span className={`badge ${med.total_stock <= med.reorder_level ? 'badge-warning' : 'badge-success'}`}>
                      {med.total_stock || 0}
                    </span>
                  </td>
                  <td>₹{med.selling_price}</td>
                  <td>
                    <div className="flex gap-sm">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(med)} title="Edit"><Edit size={16} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(med.id)} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Medicine Name *</label>
                    <input type="text" className="form-input" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Generic Name</label>
                    <input type="text" className="form-input" value={formData.generic_name} onChange={(e) => setFormData({...formData, generic_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})}>
                      <option value="">Select Category</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dosage Form</label>
                    <select className="form-select" value={formData.dosage_form} onChange={(e) => setFormData({...formData, dosage_form: e.target.value})}>
                      {dosageForms.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Strength</label>
                    <input type="text" className="form-input" placeholder="e.g., 500mg" value={formData.strength} onChange={(e) => setFormData({...formData, strength: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Manufacturer</label>
                    <input type="text" className="form-input" value={formData.manufacturer} onChange={(e) => setFormData({...formData, manufacturer: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Price (₹) *</label>
                    <input type="number" step="0.01" className="form-input" value={formData.unit_price} onChange={(e) => setFormData({...formData, unit_price: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selling Price (₹) *</label>
                    <input type="number" step="0.01" className="form-input" value={formData.selling_price} onChange={(e) => setFormData({...formData, selling_price: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reorder Level</label>
                    <input type="number" className="form-input" value={formData.reorder_level} onChange={(e) => setFormData({...formData, reorder_level: parseInt(e.target.value)})} />
                  </div>
                  <div className="form-group" style={{display: 'flex', alignItems: 'center', paddingTop: '1.5rem'}}>
                    <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                      <input type="checkbox" checked={formData.requires_prescription} onChange={(e) => setFormData({...formData, requires_prescription: e.target.checked})} />
                      Requires Prescription
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingMedicine ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
