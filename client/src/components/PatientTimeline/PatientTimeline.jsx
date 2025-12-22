import { useState, useEffect } from 'react';
import { patientTimelineAPI } from '../../services/api';
import { FileText, ShoppingCart, Calendar, Clock, ChevronDown, ChevronUp, User, Pill, CreditCard } from 'lucide-react';
import './PatientTimeline.css';

export default function PatientTimeline({ patientId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    if (patientId) {
      fetchTimeline();
    }
  }, [patientId]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await patientTimelineAPI.getTimeline(patientId);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'prescription': return <FileText size={18} />;
      case 'purchase': return <ShoppingCart size={18} />;
      default: return <Calendar size={18} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'prescription': return 'var(--primary)';
      case 'purchase': return 'var(--success)';
      default: return 'var(--text-muted)';
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="timeline-loading">
        <div className="skeleton-pulse" style={{ height: '60px', marginBottom: '1rem' }} />
        <div className="skeleton-pulse" style={{ height: '60px', marginBottom: '1rem' }} />
        <div className="skeleton-pulse" style={{ height: '60px' }} />
      </div>
    );
  }

  if (error) {
    return <div className="timeline-error">{error}</div>;
  }

  return (
    <div className="patient-timeline">
      {/* Patient Header */}
      <div className="timeline-header">
        <div className="patient-info">
          <div className="patient-avatar">
            <User size={24} />
          </div>
          <div>
            <h3>{data?.patient?.full_name}</h3>
            <span className="patient-code">{data?.patient?.patient_code}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="timeline-stats">
        <div className="stat-card">
          <FileText size={20} />
          <div>
            <span className="stat-value">{data?.stats?.totalPrescriptions || 0}</span>
            <span className="stat-label">Prescriptions</span>
          </div>
        </div>
        <div className="stat-card">
          <ShoppingCart size={20} />
          <div>
            <span className="stat-value">{data?.stats?.totalPurchases || 0}</span>
            <span className="stat-label">Purchases</span>
          </div>
        </div>
        <div className="stat-card">
          <CreditCard size={20} />
          <div>
            <span className="stat-value">₹{data?.stats?.totalSpent?.toFixed(2) || '0.00'}</span>
            <span className="stat-label">Total Spent</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="timeline-list">
        {data?.timeline?.length === 0 && (
          <div className="timeline-empty">
            <Calendar size={48} />
            <p>No history found for this patient</p>
          </div>
        )}
        
        {data?.timeline?.map((item, idx) => (
          <div 
            key={idx} 
            className={`timeline-item ${expandedItems[idx] ? 'expanded' : ''}`}
            onClick={() => toggleExpand(idx)}
          >
            <div className="timeline-icon" style={{ backgroundColor: getTypeColor(item.type) }}>
              {getIcon(item.type)}
            </div>
            
            <div className="timeline-content">
              <div className="timeline-row">
                <div className="timeline-main">
                  <h4>{item.title}</h4>
                  <span className="timeline-subtitle">{item.subtitle}</span>
                  {item.status && (
                    <span className={`badge badge-${item.status?.toLowerCase()}`}>
                      {item.status}
                    </span>
                  )}
                </div>
                <div className="timeline-meta">
                  <span className="timeline-date">
                    <Clock size={14} /> {formatDate(item.date)}
                  </span>
                  <button className="expand-btn">
                    {expandedItems[idx] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>
              
              {expandedItems[idx] && item.details && (
                <div className="timeline-details">
                  {item.type === 'prescription' && (
                    <>
                      {item.details.diagnosis && (
                        <p><strong>Diagnosis:</strong> {item.details.diagnosis}</p>
                      )}
                      {item.details.medicines?.length > 0 && (
                        <div className="medicines-list">
                          <strong>Medicines:</strong>
                          <ul>
                            {item.details.medicines.map((med, mIdx) => (
                              <li key={mIdx}>
                                <Pill size={14} />
                                <span>{med.name}</span>
                                <span className="dosage">{med.dosage} × {med.quantity}</span>
                                {med.duration && <span className="duration">({med.duration})</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                  
                  {item.type === 'purchase' && (
                    <>
                      <p><strong>Amount:</strong> ₹{parseFloat(item.details.amount).toFixed(2)}</p>
                      <p><strong>Payment:</strong> {item.details.payment_method}</p>
                      <p><strong>Served by:</strong> {item.details.served_by}</p>
                      {item.details.items?.length > 0 && (
                        <div className="medicines-list">
                          <strong>Items:</strong>
                          <ul>
                            {item.details.items.map((itm, iIdx) => (
                              <li key={iIdx}>
                                <Pill size={14} />
                                <span>{itm.name}</span>
                                <span className="dosage">× {itm.quantity}</span>
                                <span className="price">₹{parseFloat(itm.total).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
