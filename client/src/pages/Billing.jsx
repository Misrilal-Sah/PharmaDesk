import { useState, useEffect } from 'react';
import { billingAPI, patientsAPI, medicinesAPI } from '../services/api';
import { useToast } from '../components/Toast/Toast';
import { TableSkeleton } from '../components/Skeleton/Skeleton';
import ExportButton from '../components/ExportButton/ExportButton';
import { downloadInvoice } from '../utils/generateInvoice';
import { Receipt, Plus, X, Printer, ShoppingCart, Download, Eye, Mail } from 'lucide-react';

export default function Billing() {
  const [sales, setSales] = useState([]);
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showInvoice, setShowInvoice] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [formData, setFormData] = useState({ patient_id: '', payment_method: 'Cash', discount_amount: 0, items: [] });
  const [newItem, setNewItem] = useState({ medicine_id: '', quantity: 1 });
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [salesRes, patRes, medRes] = await Promise.all([
        billingAPI.getAll(),
        patientsAPI.getAll({ limit: 500 }),
        medicinesAPI.getAll({ limit: 500 })
      ]);
      setSales(salesRes.data || []);
      setPatients(patRes.data.patients || []);
      setMedicines(medRes.data.medicines || []);
    } catch (error) { 
      toast.error('Failed to fetch billing data');
    }
    finally { setLoading(false); }
  };

  const addItem = () => {
    if (!newItem.medicine_id || !newItem.quantity) {
      toast.warning('Select medicine and quantity');
      return;
    }
    const med = medicines.find(m => m.id === parseInt(newItem.medicine_id));
    setFormData({ ...formData, items: [...formData.items, { ...newItem, medicine_name: med?.name, unit_price: med?.selling_price }] });
    setNewItem({ medicine_id: '', quantity: 1 });
  };

  const removeItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const calculateTotal = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    return subtotal - (formData.discount_amount || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) { 
      toast.warning('Add at least one item'); 
      return; 
    }
    try {
      await billingAPI.create({
        ...formData,
        items: formData.items.map(i => ({ medicine_id: parseInt(i.medicine_id), quantity: parseInt(i.quantity), unit_price: i.unit_price }))
      });
      toast.success('Sale completed successfully!');
      setShowModal(false);
      setFormData({ patient_id: '', payment_method: 'Cash', discount_amount: 0, items: [] });
      fetchData();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to create sale'); }
  };

  const viewInvoice = async (id) => {
    try {
      const res = await billingAPI.getById(id);
      setShowInvoice(res.data);
    } catch (error) { toast.error('Failed to load invoice'); }
  };

  const openEmailModal = () => {
    // Pre-fill with patient email if available
    const patient = patients.find(p => p.id === showInvoice?.patient_id);
    setEmailAddress(patient?.email || showInvoice?.patient_email || '');
    setShowEmailModal(true);
  };

  const sendEmailReceipt = async () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      toast.warning('Please enter a valid email address');
      return;
    }
    setSendingEmail(true);
    try {
      await billingAPI.sendEmail(showInvoice.id, emailAddress);
      toast.success('Receipt sent successfully!');
      setShowEmailModal(false);
      setEmailAddress('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const exportColumns = [
    { key: 'invoice_number', label: 'Invoice #' },
    { key: 'patient_name', label: 'Customer' },
    { key: 'sale_date', label: 'Date' },
    { key: 'total_amount', label: 'Total' },
    { key: 'payment_method', label: 'Payment' },
    { key: 'payment_status', label: 'Status' }
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Billing & Sales</h2>
        <div className="flex gap-sm">
          <ExportButton data={sales} filename="sales" columns={exportColumns} />
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> New Sale
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={7} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center" style={{ padding: '3rem' }}>
                    <ShoppingCart size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <p className="text-muted">No sales found</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} style={{ marginTop: '0.5rem' }}>
                      <Plus size={16} /> Create First Sale
                    </button>
                  </td>
                </tr>
              ) : sales.map(sale => (
                <tr key={sale.id}>
                  <td><span className="badge badge-primary">{sale.invoice_number}</span></td>
                  <td>{sale.patient_name || 'Walk-in'}</td>
                  <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                  <td><strong>₹{sale.total_amount?.toLocaleString()}</strong></td>
                  <td>{sale.payment_method}</td>
                  <td><span className={`badge badge-${sale.payment_status === 'Paid' ? 'success' : 'warning'}`}>{sale.payment_status}</span></td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => viewInvoice(sale.id)} title="View Invoice">
                      <Eye size={16} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Sale Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>New Sale</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Customer (Optional)</label>
                    <select className="form-select" value={formData.patient_id} onChange={(e) => setFormData({...formData, patient_id: e.target.value})}>
                      <option value="">Walk-in Customer</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select className="form-select" value={formData.payment_method} onChange={(e) => setFormData({...formData, payment_method: e.target.value})}>
                      {['Cash', 'Card', 'UPI', 'Insurance', 'Credit'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="card" style={{marginTop: '1rem', padding: '1rem'}}>
                  <h4 style={{marginBottom: '1rem'}}>Items</h4>
                  <div className="grid" style={{gridTemplateColumns: '2fr 1fr auto', gap: '0.5rem', alignItems: 'end'}}>
                    <div className="form-group" style={{margin: 0}}>
                      <label className="form-label">Medicine</label>
                      <select className="form-select" value={newItem.medicine_id} onChange={(e) => setNewItem({...newItem, medicine_id: e.target.value})}>
                        <option value="">Select</option>
                        {medicines.map(m => <option key={m.id} value={m.id}>{m.name} - ₹{m.selling_price}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{margin: 0}}>
                      <label className="form-label">Qty</label>
                      <input type="number" className="form-input" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} />
                    </div>
                    <button type="button" className="btn btn-primary" onClick={addItem}>Add</button>
                  </div>

                  {formData.items.length > 0 && (
                    <div style={{marginTop: '1rem'}}>
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center" style={{padding: '0.5rem', background: 'var(--background-secondary)', borderRadius: '4px', marginBottom: '0.5rem'}}>
                          <span>{item.medicine_name} x {item.quantity}</span>
                          <div className="flex items-center gap-md">
                            <strong>₹{(item.unit_price * item.quantity).toFixed(2)}</strong>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(idx)}><X size={16} /></button>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between" style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)'}}>
                        <div className="form-group" style={{margin: 0, width: '120px'}}>
                          <label className="form-label">Discount (₹)</label>
                          <input type="number" className="form-input" value={formData.discount_amount} onChange={(e) => setFormData({...formData, discount_amount: parseFloat(e.target.value) || 0})} />
                        </div>
                        <div style={{textAlign: 'right'}}>
                          <div className="text-muted">Total</div>
                          <div style={{fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)'}}>₹{calculateTotal().toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Complete Sale</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice View Modal */}
      {showInvoice && (
        <div className="modal-overlay" onClick={() => setShowInvoice(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Invoice #{showInvoice.invoice_number}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowInvoice(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{textAlign: 'center', marginBottom: '1rem'}}>
                <h2 style={{color: 'var(--primary)'}}>PharmaDesk</h2>
                <p className="text-muted">Invoice</p>
              </div>
              <div className="grid grid-2" style={{marginBottom: '1rem'}}>
                <div><strong>Date:</strong> {new Date(showInvoice.sale_date).toLocaleString()}</div>
                <div><strong>Customer:</strong> {showInvoice.patient_name || 'Walk-in'}</div>
              </div>
              <table className="table" style={{marginBottom: '1rem'}}>
                <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {showInvoice.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.medicine_name}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.unit_price}</td>
                      <td>₹{item.total_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{textAlign: 'right'}}>
                <div>Subtotal: ₹{showInvoice.subtotal}</div>
                {showInvoice.discount_amount > 0 && <div>Discount: -₹{showInvoice.discount_amount}</div>}
                <div style={{fontSize: '1.25rem', fontWeight: 700}}>Total: ₹{showInvoice.total_amount}</div>
              </div>
            </div>
            <div className="modal-footer" style={{gap: '0.5rem'}}>
              <button className="btn btn-secondary" onClick={openEmailModal}>
                <Mail size={16} /> Email Receipt
              </button>
              <button className="btn btn-primary" onClick={() => downloadInvoice(showInvoice)}>
                <Download size={16} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="modal" style={{maxWidth: '420px'}} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Mail size={20} /> Send Receipt via Email</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEmailModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{marginBottom: '1rem'}}>
                <label className="form-label" style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="customer@email.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  autoFocus
                  style={{width: '100%'}}
                />
              </div>
              <p style={{fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5}}>
                A digital receipt will be sent to this email address.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowEmailModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={sendEmailReceipt} disabled={sendingEmail || !emailAddress}>
                <Mail size={16} /> {sendingEmail ? 'Sending...' : 'Send Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
