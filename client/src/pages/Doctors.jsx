import { useState, useEffect } from 'react';
import { doctorsAPI } from '../services/api';
import { useToast } from '../components/Toast/Toast';
import { useConfirm } from '../components/ConfirmModal/ConfirmModal';
import { TableSkeleton } from '../components/Skeleton/Skeleton';
import ExportButton from '../components/ExportButton/ExportButton';
import { useSortPaginate, Pagination } from '../utils/useSortPaginate';
import { Search, Plus, Edit, Trash2, X, Stethoscope } from 'lucide-react';

export default function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '', specialization: '', license_number: '', phone: '', email: '', hospital_affiliation: ''
  });
  const toast = useToast();
  const confirm = useConfirm();
  const { SortBtn, paginated, page, setPage, perPage, setPerPage, totalPages, totalItems } = useSortPaginate(doctors);

  useEffect(() => { fetchDoctors(); }, [search]);

  const fetchDoctors = async () => {
    try {
      const response = await doctorsAPI.getAll({ search });
      setDoctors(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch doctors');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDoctor) {
        await doctorsAPI.update(editingDoctor.id, formData);
        toast.success('Doctor updated successfully!');
      } else {
        await doctorsAPI.create(formData);
        toast.success('Doctor created successfully!');
      }
      setShowModal(false); setEditingDoctor(null); resetForm(); fetchDoctors();
    } catch (error) { toast.error(error.response?.data?.error || 'Operation failed'); }
  };

  const handleEdit = (doc) => {
    setEditingDoctor(doc);
    setFormData({
      full_name: doc.full_name || '', specialization: doc.specialization || '',
      license_number: doc.license_number || '', phone: doc.phone || '',
      email: doc.email || '', hospital_affiliation: doc.hospital_affiliation || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Doctor',
      message: 'Are you sure you want to delete this doctor?',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    try { 
      await doctorsAPI.delete(id); 
      toast.success('Doctor deleted!');
      fetchDoctors(); 
    } catch (error) { toast.error(error.response?.data?.error || 'Delete failed'); }
  };

  const resetForm = () => {
    setFormData({ full_name: '', specialization: '', license_number: '', phone: '', email: '', hospital_affiliation: '' });
  };

  const exportColumns = [
    { key: 'doctor_code', label: 'Code' },
    { key: 'full_name', label: 'Name' },
    { key: 'specialization', label: 'Specialization' },
    { key: 'license_number', label: 'License No.' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'hospital_affiliation', label: 'Hospital' }
  ];

  return (
    <div>
      <div className="page-header">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Search doctors..." className="form-input" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-sm">
          <ExportButton data={doctors} filename="doctors" columns={exportColumns} />
          <button className="btn btn-primary" onClick={() => { resetForm(); setEditingDoctor(null); setShowModal(true); }}>
            <Plus size={18} /> Add Doctor
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th><SortBtn field="doctor_code">Code</SortBtn></th><th><SortBtn field="full_name">Name</SortBtn></th><th><SortBtn field="specialization">Specialization</SortBtn></th><th>License No.</th><th><SortBtn field="phone">Phone</SortBtn></th><th>Actions</th></tr>
            </thead>
            <tbody>
              {doctors.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '3rem' }}>
                    <Stethoscope size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <p className="text-muted">No doctors found</p>
                    <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowModal(true); }} style={{ marginTop: '0.5rem' }}>
                      <Plus size={16} /> Add First Doctor
                    </button>
                  </td>
                </tr>
              ) : paginated.map((doc) => (
                <tr key={doc.id}>
                  <td><span className="badge badge-info">{doc.doctor_code}</span></td>
                  <td><strong>{doc.full_name}</strong></td>
                  <td>{doc.specialization || '-'}</td>
                  <td>{doc.license_number}</td>
                  <td>{doc.phone || '-'}</td>
                  <td>
                    <div className="flex gap-sm">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(doc)} title="Edit"><Edit size={16} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(doc.id)} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {doctors.length > 0 && (
            <Pagination page={page} totalPages={totalPages} totalItems={totalItems} perPage={perPage} setPage={setPage} setPerPage={setPerPage} />
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input type="text" className="form-input" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">License Number *</label>
                  <input type="text" className="form-input" value={formData.license_number} onChange={(e) => setFormData({...formData, license_number: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Specialization</label>
                  <input type="text" className="form-input" placeholder="e.g., Cardiologist, General Physician" value={formData.specialization} onChange={(e) => setFormData({...formData, specialization: e.target.value})} />
                </div>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input type="tel" className="form-input" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Hospital Affiliation</label>
                  <input type="text" className="form-input" value={formData.hospital_affiliation} onChange={(e) => setFormData({...formData, hospital_affiliation: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingDoctor ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
