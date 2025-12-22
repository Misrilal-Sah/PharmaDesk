import { useState, useEffect } from 'react';
import { patientsAPI } from '../services/api';
import { useToast } from '../components/Toast/Toast';
import { useConfirm } from '../components/ConfirmModal/ConfirmModal';
import { TableSkeleton } from '../components/Skeleton/Skeleton';
import ExportButton from '../components/ExportButton/ExportButton';
import { Search, Plus, Edit, Trash2, X, Users, Clock } from 'lucide-react';
import PatientTimeline from '../components/PatientTimeline/PatientTimeline';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showTimeline, setShowTimeline] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '', date_of_birth: '', gender: '', phone: '', email: '',
    address: '', blood_group: '', allergies: '', medical_history: '',
    emergency_contact: '', emergency_phone: ''
  });
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    fetchPatients();
  }, [search]);

  const fetchPatients = async () => {
    try {
      const response = await patientsAPI.getAll({ search });
      setPatients(response.data.patients || []);
    } catch (error) {
      toast.error('Failed to fetch patients');
      console.error('Failed to fetch patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPatient) {
        await patientsAPI.update(editingPatient.id, formData);
        toast.success('Patient updated successfully!');
      } else {
        await patientsAPI.create(formData);
        toast.success('Patient created successfully!');
      }
      setShowModal(false);
      setEditingPatient(null);
      resetForm();
      fetchPatients();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (patient) => {
    setEditingPatient(patient);
    setFormData({
      full_name: patient.full_name || '',
      date_of_birth: patient.date_of_birth?.split('T')[0] || '',
      gender: patient.gender || '',
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      blood_group: patient.blood_group || '',
      allergies: patient.allergies || '',
      medical_history: patient.medical_history || '',
      emergency_contact: patient.emergency_contact || '',
      emergency_phone: patient.emergency_phone || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Patient',
      message: 'Are you sure you want to delete this patient? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    try {
      await patientsAPI.delete(id);
      toast.success('Patient deleted successfully!');
      fetchPatients();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Delete failed');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '', date_of_birth: '', gender: '', phone: '', email: '',
      address: '', blood_group: '', allergies: '', medical_history: '',
      emergency_contact: '', emergency_phone: ''
    });
  };

  const exportColumns = [
    { key: 'patient_code', label: 'Patient Code' },
    { key: 'full_name', label: 'Name' },
    { key: 'gender', label: 'Gender' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'blood_group', label: 'Blood Group' },
    { key: 'address', label: 'Address' },
    { key: 'allergies', label: 'Allergies' }
  ];

  return (
    <div>
      <div className="page-header">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search patients..."
            className="form-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-sm">
          <ExportButton data={patients} filename="patients" columns={exportColumns} />
          <button className="btn btn-primary" onClick={() => { resetForm(); setEditingPatient(null); setShowModal(true); }}>
            <Plus size={18} /> Add Patient
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Patient Code</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Blood Group</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '3rem' }}>
                    <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <p className="text-muted">No patients found</p>
                    <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowModal(true); }} style={{ marginTop: '0.5rem' }}>
                      <Plus size={16} /> Add First Patient
                    </button>
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id}>
                    <td><span className="badge badge-primary">{patient.patient_code}</span></td>
                    <td><strong>{patient.full_name}</strong></td>
                    <td>{patient.gender || '-'}</td>
                    <td>{patient.phone || '-'}</td>
                    <td>{patient.blood_group || '-'}</td>
                    <td>
                      <div className="flex gap-sm">
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowTimeline(patient.id)} title="View History"><Clock size={16} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(patient)} title="Edit"><Edit size={16} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(patient.id)} title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingPatient ? 'Edit Patient' : 'Add New Patient'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input type="text" className="form-input" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-input" value={formData.date_of_birth} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select className="form-select" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Blood Group</label>
                    <select className="form-select" value={formData.blood_group} onChange={(e) => setFormData({...formData, blood_group: e.target.value})}>
                      <option value="">Select</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
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
                  <label className="form-label">Address</label>
                  <textarea className="form-textarea" rows="2" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Allergies</label>
                  <input type="text" className="form-input" placeholder="e.g., Penicillin, Aspirin" value={formData.allergies} onChange={(e) => setFormData({...formData, allergies: e.target.value})} />
                </div>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Emergency Contact</label>
                    <input type="text" className="form-input" value={formData.emergency_contact} onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Emergency Phone</label>
                    <input type="tel" className="form-input" value={formData.emergency_phone} onChange={(e) => setFormData({...formData, emergency_phone: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingPatient ? 'Update' : 'Create'} Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timeline Modal */}
      {showTimeline && (
        <div className="modal-overlay" onClick={() => setShowTimeline(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', padding: 0 }}>
            <div className="modal-header" style={{ marginBottom: 0, borderBottom: 'none', padding: '0.75rem 1rem' }}>
              <h3><Clock size={20} /> Patient History</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowTimeline(null)}><X size={20} /></button>
            </div>
            <PatientTimeline patientId={showTimeline} />
          </div>
        </div>
      )}
    </div>
  );
}
