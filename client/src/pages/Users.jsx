import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast/Toast';
import { useConfirm } from '../components/ConfirmModal/ConfirmModal';
import { TableSkeleton } from '../components/Skeleton/Skeleton';
import ExportButton from '../components/ExportButton/ExportButton';
import { Plus, Edit, Trash2, X, Shield, UserCog } from 'lucide-react';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', full_name: '', role: 'Staff', phone: '' });
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data || []);
    } catch (error) { 
      toast.error('Failed to fetch users');
    }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const { password, ...updateData } = formData;
        await usersAPI.update(editingUser.id, updateData);
        toast.success('User updated successfully!');
      } else {
        await usersAPI.create(formData);
        toast.success('User created successfully!');
      }
      setShowModal(false); setEditingUser(null); resetForm(); fetchUsers();
    } catch (error) { toast.error(error.response?.data?.error || 'Operation failed'); }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({ username: user.username, email: user.email, password: '', full_name: user.full_name, role: user.role, phone: user.phone || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    try { 
      await usersAPI.delete(id); 
      toast.success('User deleted!');
      fetchUsers(); 
    }
    catch (error) { toast.error(error.response?.data?.error || 'Delete failed'); }
  };

  const resetForm = () => {
    setFormData({ username: '', email: '', password: '', full_name: '', role: 'Staff', phone: '' });
  };

  const roleColors = { Admin: 'error', Pharmacist: 'primary', Doctor: 'success', Staff: 'info' };

  const exportColumns = [
    { key: 'full_name', label: 'Name' },
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'phone', label: 'Phone' },
    { key: 'is_active', label: 'Status' }
  ];

  if (currentUser?.role !== 'Admin') {
    return <div className="card text-center" style={{padding: '3rem'}}><Shield size={48} style={{opacity: 0.5, marginBottom: '1rem'}} /><h3>Access Denied</h3><p className="text-muted">Only administrators can access user management.</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">User Management</h2>
        <div className="flex gap-sm">
          <ExportButton data={users} filename="users" columns={exportColumns} />
          <button className="btn btn-primary" onClick={() => { resetForm(); setEditingUser(null); setShowModal(true); }}>
            <Plus size={18} /> Add User
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '3rem' }}>
                    <UserCog size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <p className="text-muted">No users found</p>
                  </td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id}>
                  <td><strong>{user.full_name}</strong></td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td><span className={`badge badge-${roleColors[user.role] || 'info'}`}>{user.role}</span></td>
                  <td><span className={`badge badge-${user.is_active ? 'success' : 'error'}`}>{user.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="flex gap-sm">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(user)} title="Edit"><Edit size={16} /></button>
                      {user.id !== currentUser.id && <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(user.id)} title="Delete"><Trash2 size={16} /></button>}
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input type="text" className="form-input" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required />
                </div>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Username *</label>
                    <input type="text" className="form-input" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required disabled={!!editingUser} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                  </div>
                </div>
                {!editingUser && (
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input type="password" className="form-input" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                  </div>
                )}
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                      {['Admin', 'Pharmacist', 'Doctor', 'Staff'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input type="tel" className="form-input" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingUser ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
