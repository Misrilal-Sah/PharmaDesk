import { useState, useEffect } from 'react';
import { inventoryAPI, medicinesAPI, suppliersAPI } from '../services/api';
import { useToast } from '../components/Toast/Toast';
import { TableSkeleton, SkeletonStatCard } from '../components/Skeleton/Skeleton';
import ExportButton from '../components/ExportButton/ExportButton';
import { Package, AlertTriangle, Clock, Plus, X } from 'lucide-react';

export default function Inventory() {
  const [overview, setOverview] = useState(null);
  const [batches, setBatches] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    medicine_id: '', batch_number: '', supplier_id: '', quantity: '', purchase_price: '', manufacture_date: '', expiry_date: ''
  });
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [overviewRes, batchesRes, medsRes, suppRes] = await Promise.all([
        inventoryAPI.getOverview(),
        inventoryAPI.getBatches(),
        medicinesAPI.getAll({ limit: 500 }),
        suppliersAPI.getAll({ active_only: true })
      ]);
      setOverview(overviewRes.data);
      setBatches(batchesRes.data || []);
      setMedicines(medsRes.data.medicines || []);
      setSuppliers(suppRes.data || []);
    } catch (error) { 
      toast.error('Failed to fetch inventory data');
    }
    finally { setLoading(false); }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    try {
      await inventoryAPI.addBatch({
        ...formData,
        quantity: parseInt(formData.quantity),
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null
      });
      toast.success('Stock added successfully!');
      setShowModal(false);
      setFormData({ medicine_id: '', batch_number: '', supplier_id: '', quantity: '', purchase_price: '', manufacture_date: '', expiry_date: '' });
      fetchData();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to add batch'); }
  };

  const exportColumns = [
    { key: 'medicine_name', label: 'Medicine' },
    { key: 'medicine_code', label: 'Code' },
    { key: 'batch_number', label: 'Batch No.' },
    { key: 'remaining_quantity', label: 'Quantity' },
    { key: 'expiry_date', label: 'Expiry Date' },
    { key: 'supplier_name', label: 'Supplier' }
  ];

  return (
    <div>
      <div className="page-header">
        <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
          {['overview', 'batches', 'low-stock', 'expiring'].map(tab => (
            <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
        <div className="flex gap-sm">
          {activeTab === 'batches' && <ExportButton data={batches} filename="inventory_batches" columns={exportColumns} />}
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Add Stock
          </button>
        </div>
      </div>

      {loading && activeTab === 'overview' && (
        <div className="stats-grid">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      )}

      {!loading && activeTab === 'overview' && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue"><Package size={24} /></div>
            <div className="stat-content">
              <h3>{overview?.total_medicines || 0}</h3>
              <p>Total Medicines</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><AlertTriangle size={24} /></div>
            <div className="stat-content">
              <h3>{overview?.low_stock_count || 0}</h3>
              <p>Low Stock Items</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><Clock size={24} /></div>
            <div className="stat-content">
              <h3>{overview?.expiring_soon_count || 0}</h3>
              <p>Expiring Soon</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><Package size={24} /></div>
            <div className="stat-content">
              <h3>₹{overview?.total_inventory_value?.toLocaleString() || 0}</h3>
              <p>Inventory Value</p>
            </div>
          </div>
        </div>
      )}

      {loading && activeTab !== 'overview' && <TableSkeleton rows={5} columns={5} />}

      {!loading && activeTab === 'batches' && (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Medicine</th><th>Batch No.</th><th>Quantity</th><th>Expiry Date</th><th>Supplier</th></tr></thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center" style={{ padding: '3rem' }}>
                    <Package size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <p className="text-muted">No batches found</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} style={{ marginTop: '0.5rem' }}>
                      <Plus size={16} /> Add First Batch
                    </button>
                  </td>
                </tr>
              ) : batches.map(b => (
                <tr key={b.id}>
                  <td><strong>{b.medicine_name}</strong><div className="text-sm text-muted">{b.medicine_code}</div></td>
                  <td>{b.batch_number}</td>
                  <td><span className="badge badge-info">{b.remaining_quantity}</span></td>
                  <td>{new Date(b.expiry_date).toLocaleDateString()}</td>
                  <td>{b.supplier_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && activeTab === 'low-stock' && (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Medicine</th><th>Current Stock</th><th>Reorder Level</th><th>Status</th></tr></thead>
            <tbody>
              {overview?.low_stock_items?.length === 0 ? (
                <tr><td colSpan="4" className="text-center text-muted" style={{padding: '2rem'}}>No low stock items 🎉</td></tr>
              ) : overview?.low_stock_items?.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong><div className="text-sm text-muted">{item.medicine_code}</div></td>
                  <td><span className="badge badge-warning">{item.total_stock}</span></td>
                  <td>{item.reorder_level}</td>
                  <td><span className="badge badge-error">Low Stock</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && activeTab === 'expiring' && (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Medicine</th><th>Batch</th><th>Quantity</th><th>Expiry Date</th><th>Status</th></tr></thead>
            <tbody>
              {overview?.expiring_soon?.length === 0 && overview?.expired_items?.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-muted" style={{padding: '2rem'}}>No expiring items 🎉</td></tr>
              ) : (
                <>
                  {overview?.expired_items?.map(item => (
                    <tr key={item.id} style={{background: 'var(--error-bg)'}}>
                      <td><strong>{item.medicine_name}</strong></td>
                      <td>{item.batch_number}</td>
                      <td>{item.remaining_quantity}</td>
                      <td>{new Date(item.expiry_date).toLocaleDateString()}</td>
                      <td><span className="badge badge-error">Expired</span></td>
                    </tr>
                  ))}
                  {overview?.expiring_soon?.map(item => (
                    <tr key={item.id}>
                      <td><strong>{item.medicine_name}</strong></td>
                      <td>{item.batch_number}</td>
                      <td>{item.remaining_quantity}</td>
                      <td>{new Date(item.expiry_date).toLocaleDateString()}</td>
                      <td><span className="badge badge-warning">Expiring Soon</span></td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Stock</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddBatch}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Medicine *</label>
                  <select className="form-select" value={formData.medicine_id} onChange={(e) => setFormData({...formData, medicine_id: e.target.value})} required>
                    <option value="">Select Medicine</option>
                    {medicines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.medicine_code})</option>)}
                  </select>
                </div>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Batch Number *</label>
                    <input type="text" className="form-input" value={formData.batch_number} onChange={(e) => setFormData({...formData, batch_number: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input type="number" className="form-input" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expiry Date *</label>
                    <input type="date" className="form-input" value={formData.expiry_date} onChange={(e) => setFormData({...formData, expiry_date: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Manufacture Date</label>
                    <input type="date" className="form-input" value={formData.manufacture_date} onChange={(e) => setFormData({...formData, manufacture_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purchase Price (₹)</label>
                    <input type="number" step="0.01" className="form-input" value={formData.purchase_price} onChange={(e) => setFormData({...formData, purchase_price: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Supplier</label>
                    <select className="form-select" value={formData.supplier_id} onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}>
                      <option value="">Select Supplier</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
