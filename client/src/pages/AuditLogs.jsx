import { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast/Toast';
import { TableSkeleton } from '../components/Skeleton/Skeleton';
import { 
  Shield, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  Eye,
  RefreshCw
} from 'lucide-react';

const actionIcons = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  VIEW: Eye
};

const actionColors = {
  CREATE: 'success',
  UPDATE: 'primary',
  DELETE: 'error',
  LOGIN: 'info',
  LOGOUT: 'warning',
  VIEW: 'info'
};

export default function AuditLogs() {
  const { user } = useAuth();
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    user_id: '',
    action: '',
    entity_type: '',
    start_date: '',
    end_date: '',
    search: ''
  });
  const [filterOptions, setFilterOptions] = useState({ users: [], actions: [], entities: [] });
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
    fetchFilterOptions();
  }, [pagination.page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { 
        page: pagination.page, 
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      };
      const response = await auditAPI.getAll(params);
      setLogs(response.data.logs || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        totalPages: response.data.totalPages
      }));
    } catch (error) {
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await auditAPI.getFilters();
      setFilterOptions(response.data);
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ user_id: '', action: '', entity_type: '', start_date: '', end_date: '', search: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action) => {
    const Icon = actionIcons[action] || Eye;
    return <Icon size={14} />;
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="card text-center" style={{ padding: '3rem' }}>
        <Shield size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
        <h3>Access Denied</h3>
        <p className="text-muted">Only administrators can view audit logs.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">
          <Shield size={24} style={{ marginRight: '0.5rem' }} />
          Audit Logs
        </h2>
        <div className="flex gap-sm">
          <button 
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} /> Filters
          </button>
          <button className="btn btn-ghost" onClick={fetchLogs}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Search</label>
              <div className="search-box" style={{ width: '100%' }}>
                <Search size={16} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="User or entity..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">User</label>
              <select 
                className="form-select" 
                value={filters.user_id} 
                onChange={(e) => handleFilterChange('user_id', e.target.value)}
              >
                <option value="">All Users</option>
                {filterOptions.users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Action</label>
              <select 
                className="form-select" 
                value={filters.action} 
                onChange={(e) => handleFilterChange('action', e.target.value)}
              >
                <option value="">All Actions</option>
                {filterOptions.actions.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Entity Type</label>
              <select 
                className="form-select" 
                value={filters.entity_type} 
                onChange={(e) => handleFilterChange('entity_type', e.target.value)}
              >
                <option value="">All Entities</option>
                {filterOptions.entities.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-input"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-input"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginTop: '1rem', textAlign: 'right' }}>
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Logs Table */}
      {loading ? (
        <TableSkeleton rows={10} columns={6} />
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center" style={{ padding: '3rem' }}>
                      <Shield size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                      <p className="text-muted">No audit logs found</p>
                    </td>
                  </tr>
                ) : logs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                        {formatDate(log.created_at)}
                      </span>
                    </td>
                    <td>
                      <strong>{log.user_name || 'System'}</strong>
                    </td>
                    <td>
                      <span className={`badge badge-${actionColors[log.action] || 'info'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {getActionIcon(log.action)}
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <div>
                        <span className="text-muted">{log.entity_type}</span>
                        {log.entity_name && (
                          <div style={{ fontSize: '0.875rem' }}>{log.entity_name}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      {(log.old_values || log.new_values) && (
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye size={14} /> View
                        </button>
                      )}
                    </td>
                    <td>
                      <span className="text-muted" style={{ fontSize: '0.8125rem' }}>
                        {log.ip_address || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <span className="text-muted">
                Showing {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex gap-sm">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span style={{ padding: '0.5rem 1rem' }}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Log Details</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedLog(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
                <div><strong>Timestamp:</strong> {formatDate(selectedLog.created_at)}</div>
                <div><strong>User:</strong> {selectedLog.user_name}</div>
                <div><strong>Action:</strong> {selectedLog.action}</div>
                <div><strong>Entity:</strong> {selectedLog.entity_type}</div>
              </div>
              
              {selectedLog.new_values && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>Data</h4>
                  <pre style={{ 
                    background: 'var(--background-secondary)', 
                    padding: '1rem', 
                    borderRadius: 'var(--radius-md)',
                    overflow: 'auto',
                    maxHeight: '300px',
                    fontSize: '0.8125rem'
                  }}>
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
