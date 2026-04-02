import { useState, useEffect } from 'react';
import { prescriptionsAPI, patientsAPI, doctorsAPI, medicinesAPI } from '../services/api';
import { useToast } from '../components/Toast/Toast';
import { useConfirm } from '../components/ConfirmModal/ConfirmModal';
import { TableSkeleton } from '../components/Skeleton/Skeleton';
import ExportButton from '../components/ExportButton/ExportButton';
import { useSortPaginate, Pagination } from '../utils/useSortPaginate';
import { Search, Plus, X, CheckCircle, FileText } from 'lucide-react';

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ patient_id: '', doctor_id: '', diagnosis: '', notes: '', items: [] });
  const [newItem, setNewItem] = useState({ medicine_id: '', quantity: 1, dosage: '', frequency: '', duration: '' });
  const toast = useToast();
  const confirm = useConfirm();
  const { SortBtn, paginated, page, setPage, perPage, setPerPage, totalPages, totalItems } = useSortPaginate(prescriptions);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [rxRes, patRes, docRes, medRes] = await Promise.all([
        prescriptionsAPI.getAll(),
        patientsAPI.getAll({ limit: 500 }),
        doctorsAPI.getAll({ active_only: true }),
        medicinesAPI.getAll({ limit: 500 })
      ]);
      setPrescriptions(rxRes.data || []);
      setPatients(patRes.data.patients || []);
      setDoctors(docRes.data || []);
      setMedicines(medRes.data.medicines || []);
    } catch (error) { 
      toast.error('Failed to fetch prescriptions');
    }
    finally { setLoading(false); }
  };

  const addItem = () => {
    if (!newItem.medicine_id || !newItem.quantity) {
      toast.warning('Select medicine and quantity');
      return;
    }
    const med = medicines.find(m => m.id === parseInt(newItem.medicine_id));
    setFormData({ ...formData, items: [...formData.items, { ...newItem, medicine_name: med?.name }] });
    setNewItem({ medicine_id: '', quantity: 1, dosage: '', frequency: '', duration: '' });
  };

  const removeItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) { 
      toast.warning('Add at least one medicine'); 
      return; 
    }
    try {
      await prescriptionsAPI.create({
        ...formData,
        items: formData.items.map(i => ({ medicine_id: parseInt(i.medicine_id), quantity: parseInt(i.quantity), dosage: i.dosage, frequency: i.frequency, duration: i.duration }))
      });
      toast.success('Prescription created successfully!');
      setShowModal(false);
      setFormData({ patient_id: '', doctor_id: '', diagnosis: '', notes: '', items: [] });
      fetchData();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to create prescription'); }
  };

  const handleDispense = async (id) => {
    const confirmed = await confirm({
      title: 'Dispense Prescription',
      message: 'Dispense this prescription? Stock will be deducted from inventory.',
      type: 'warning',
      confirmText: 'Dispense',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    try {
      await prescriptionsAPI.dispense(id);
      toast.success('Prescription dispensed!');
      fetchData();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to dispense'); }
  };

  const exportColumns = [
    { key: 'prescription_code', label: 'Rx Code' },
    { key: 'patient_name', label: 'Patient' },
    { key: 'doctor_name', label: 'Doctor' },
    { key: 'prescribed_date', label: 'Date' },
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'status', label: 'Status' }
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Prescriptions</h2>
        <div className="flex gap-sm">
          <ExportButton data={prescriptions} filename="prescriptions" columns={exportColumns} />
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> New Prescription
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={7} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th><SortBtn field="prescription_code">Rx Code</SortBtn></th><th><SortBtn field="patient_name">Patient</SortBtn></th><th><SortBtn field="doctor_name">Doctor</SortBtn></th><th><SortBtn field="prescribed_date">Date</SortBtn></th><th>Items</th><th><SortBtn field="status">Status</SortBtn></th><th>Actions</th></tr></thead>
            <tbody>
              {prescriptions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center" style={{ padding: '3rem' }}>
                    <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <p className="text-muted">No prescriptions found</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} style={{ marginTop: '0.5rem' }}>
                      <Plus size={16} /> Create First Prescription
                    </button>
                  </td>
                </tr>
              ) : paginated.map(rx => (
                <tr key={rx.id}>
                  <td><span className="badge badge-primary">{rx.prescription_code}</span></td>
                  <td><strong>{rx.patient_name}</strong><div className="text-sm text-muted">{rx.patient_code}</div></td>
                  <td>Dr. {rx.doctor_name}</td>
                  <td>{new Date(rx.prescribed_date).toLocaleDateString()}</td>
                  <td>{rx.items?.length || 0} items</td>
                  <td><span className={`badge badge-${rx.status === 'Dispensed' ? 'success' : rx.status === 'Pending' ? 'warning' : 'info'}`}>{rx.status}</span></td>
                  <td>
                    {rx.status === 'Pending' && (
                      <button className="btn btn-success btn-sm" onClick={() => handleDispense(rx.id)}>
                        <CheckCircle size={16} /> Dispense
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {prescriptions.length > 0 && (
            <Pagination page={page} totalPages={totalPages} totalItems={totalItems} perPage={perPage} setPage={setPage} setPerPage={setPerPage} />
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>New Prescription</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Patient *</label>
                    <select className="form-select" value={formData.patient_id} onChange={(e) => setFormData({...formData, patient_id: e.target.value})} required>
                      <option value="">Select Patient</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.patient_code})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Doctor *</label>
                    <select className="form-select" value={formData.doctor_id} onChange={(e) => setFormData({...formData, doctor_id: e.target.value})} required>
                      <option value="">Select Doctor</option>
                      {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Diagnosis</label>
                  <input type="text" className="form-input" value={formData.diagnosis} onChange={(e) => setFormData({...formData, diagnosis: e.target.value})} />
                </div>

                <div className="card" style={{marginTop: '1rem', padding: '1rem'}}>
                  <h4 style={{marginBottom: '1rem'}}>Prescription Items</h4>
                  <div className="grid" style={{gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end'}}>
                    <div className="form-group" style={{margin: 0}}>
                      <label className="form-label">Medicine</label>
                      <select className="form-select" value={newItem.medicine_id} onChange={(e) => setNewItem({...newItem, medicine_id: e.target.value})}>
                        <option value="">Select</option>
                        {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{margin: 0}}>
                      <label className="form-label">Qty</label>
                      <input type="number" className="form-input" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} />
                    </div>
                    <div className="form-group" style={{margin: 0}}>
                      <label className="form-label">Dosage</label>
                      <input type="text" className="form-input" placeholder="e.g., 1 tab" value={newItem.dosage} onChange={(e) => setNewItem({...newItem, dosage: e.target.value})} />
                    </div>
                    <div className="form-group" style={{margin: 0}}>
                      <label className="form-label">Frequency</label>
                      <input type="text" className="form-input" placeholder="e.g., 3x daily" value={newItem.frequency} onChange={(e) => setNewItem({...newItem, frequency: e.target.value})} />
                    </div>
                    <button type="button" className="btn btn-primary" onClick={addItem}>Add</button>
                  </div>

                  {formData.items.length > 0 && (
                    <div style={{marginTop: '1rem'}}>
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center" style={{padding: '0.5rem', background: 'var(--background-secondary)', borderRadius: '4px', marginBottom: '0.5rem'}}>
                          <span><strong>{item.medicine_name}</strong> x {item.quantity} - {item.dosage} {item.frequency}</span>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(idx)}><X size={16} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Prescription</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
