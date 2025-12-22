import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportsAPI } from '../services/api';
import SalesChart from '../components/Charts/SalesChart';
import InventoryPieChart from '../components/Charts/InventoryPieChart';
import TopMedicinesChart from '../components/Charts/TopMedicinesChart';
import '../components/Charts/Charts.css';
import {
  Users,
  Pill,
  Receipt,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Clock,
  ArrowUpRight,
  Package,
  PieChart,
  BarChart3
} from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [topMedicines, setTopMedicines] = useState([]);
  const [inventoryByCategory, setInventoryByCategory] = useState([]);
  const [chartView, setChartView] = useState('quantity'); // 'quantity' or 'revenue'

  useEffect(() => {
    fetchDashboard();
    fetchChartData();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await reportsAPI.getDashboard();
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      // Fetch sales data for last 7 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [salesRes, topMedsRes, inventoryRes] = await Promise.all([
        reportsAPI.getSales({ start_date: startDate, end_date: endDate }),
        reportsAPI.getTopMedicines({ limit: 5 }),
        reportsAPI.getInventory()
      ]);

      setSalesData(salesRes.data?.daily_sales || []);
      setTopMedicines(topMedsRes.data || []);
      
      // Transform inventory data for pie chart
      if (inventoryRes.data?.by_category) {
        const pieData = inventoryRes.data.by_category.map(cat => ({
          name: cat.category || 'Uncategorized',
          value: parseFloat(cat.total_value || 0)
        })).filter(item => item.value > 0);
        setInventoryByCategory(pieData);
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Today\'s Sales',
      value: `₹${data?.today_sales?.total?.toLocaleString() || 0}`,
      subtext: `${data?.today_sales?.count || 0} transactions`,
      icon: Receipt,
      color: 'blue'
    },
    {
      label: 'Total Patients',
      value: data?.total_patients?.toLocaleString() || 0,
      subtext: 'Registered patients',
      icon: Users,
      color: 'green'
    },
    {
      label: 'Total Medicines',
      value: data?.total_medicines?.toLocaleString() || 0,
      subtext: 'Active items',
      icon: Pill,
      color: 'blue'
    },
    {
      label: 'Low Stock Items',
      value: data?.low_stock_count || 0,
      subtext: 'Need reorder',
      icon: Package,
      color: data?.low_stock_count > 0 ? 'orange' : 'green'
    },
    {
      label: 'Expiring Soon',
      value: data?.expiring_soon_count || 0,
      subtext: 'Within 30 days',
      icon: AlertTriangle,
      color: data?.expiring_soon_count > 0 ? 'red' : 'green'
    },
    {
      label: 'Pending Rx',
      value: data?.pending_prescriptions || 0,
      subtext: 'To be dispensed',
      icon: Clock,
      color: data?.pending_prescriptions > 0 ? 'orange' : 'green'
    }
  ];

  return (
    <div className="dashboard">
      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className={`stat-icon ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div className="stat-content">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
              <span className="stat-subtext">{stat.subtext}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Sales Trend Chart */}
        <div className="chart-container chart-full-width">
          <div className="chart-header">
            <h3 className="chart-title">
              <TrendingUp size={20} />
              Sales Trend (Last 7 Days)
            </h3>
          </div>
          <SalesChart data={salesData} height={280} />
        </div>

        {/* Top Medicines Chart */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">
              <BarChart3 size={20} />
              Top Selling Medicines
            </h3>
            <div className="chart-toggle">
              <button 
                className={chartView === 'quantity' ? 'active' : ''} 
                onClick={() => setChartView('quantity')}
              >
                Units
              </button>
              <button 
                className={chartView === 'revenue' ? 'active' : ''} 
                onClick={() => setChartView('revenue')}
              >
                Revenue
              </button>
            </div>
          </div>
          <TopMedicinesChart data={topMedicines} height={280} showValue={chartView} />
        </div>

        {/* Inventory Distribution Chart */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">
              <PieChart size={20} />
              Inventory by Category
            </h3>
          </div>
          <InventoryPieChart data={inventoryByCategory} height={220} />
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div className="quick-actions">
            <Link to="/prescriptions" className="quick-action-item">
              <div className="qa-icon blue">
                <Calendar size={20} />
              </div>
              <div>
                <strong>New Prescription</strong>
                <span>Create prescription for patient</span>
              </div>
              <ArrowUpRight size={18} />
            </Link>
            <Link to="/billing" className="quick-action-item">
              <div className="qa-icon green">
                <Receipt size={20} />
              </div>
              <div>
                <strong>New Sale</strong>
                <span>Process OTC or prescription sale</span>
              </div>
              <ArrowUpRight size={18} />
            </Link>
            <Link to="/patients" className="quick-action-item">
              <div className="qa-icon orange">
                <Users size={20} />
              </div>
              <div>
                <strong>Add Patient</strong>
                <span>Register new patient</span>
              </div>
              <ArrowUpRight size={18} />
            </Link>
            <Link to="/inventory" className="quick-action-item">
              <div className="qa-icon red">
                <Package size={20} />
              </div>
              <div>
                <strong>Add Stock</strong>
                <span>Receive new inventory</span>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Sales</h3>
            <Link to="/billing" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          {data?.recent_sales?.length > 0 ? (
            <div className="recent-list">
              {data.recent_sales.map((sale) => (
                <div key={sale.id} className="recent-item">
                  <div className="recent-info">
                    <strong>{sale.invoice_number}</strong>
                    <span>{sale.patient_name || 'Walk-in Customer'}</span>
                  </div>
                  <div className="recent-amount">
                    <strong>₹{sale.total_amount?.toLocaleString()}</strong>
                    <span className={`badge badge-${sale.payment_status === 'Paid' ? 'success' : 'warning'}`}>
                      {sale.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Receipt size={48} />
              <p>No sales today</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Revenue */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">
            <TrendingUp size={20} style={{ marginRight: '0.5rem' }} />
            This Month's Performance
          </h3>
        </div>
        <div className="month-stats">
          <div className="month-stat">
            <span className="month-label">Total Revenue</span>
            <span className="month-value">₹{data?.month_sales?.total?.toLocaleString() || 0}</span>
          </div>
          <div className="month-stat">
            <span className="month-label">Total Transactions</span>
            <span className="month-value">{data?.month_sales?.count || 0}</span>
          </div>
          <div className="month-stat">
            <span className="month-label">Average Sale</span>
            <span className="month-value">
              ₹{data?.month_sales?.count > 0 
                ? Math.round(data.month_sales.total / data.month_sales.count).toLocaleString() 
                : 0}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .stat-subtext {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .quick-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .quick-action-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem;
          border-radius: var(--radius-md);
          background: var(--background-secondary);
          text-decoration: none;
          color: var(--text-primary);
          transition: all var(--transition-fast);
        }
        
        .quick-action-item:hover {
          background: var(--surface-hover);
          transform: translateX(4px);
        }
        
        .quick-action-item div:nth-child(2) {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .quick-action-item strong {
          font-size: 0.9375rem;
          font-weight: 500;
        }
        
        .quick-action-item span {
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        
        .quick-action-item svg:last-child {
          color: var(--text-muted);
        }
        
        .qa-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .qa-icon.blue { background: rgba(21, 101, 192, 0.1); color: var(--primary); }
        .qa-icon.green { background: var(--success-bg); color: var(--success); }
        .qa-icon.orange { background: var(--warning-bg); color: var(--warning); }
        .qa-icon.red { background: var(--error-bg); color: var(--error); }
        
        .recent-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .recent-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: var(--background-secondary);
          border-radius: var(--radius-md);
        }
        
        .recent-info, .recent-amount {
          display: flex;
          flex-direction: column;
        }
        
        .recent-info strong, .recent-amount strong {
          font-size: 0.9375rem;
        }
        
        .recent-info span, .recent-amount span {
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        
        .recent-amount {
          text-align: right;
        }
        
        .month-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        
        .month-stat {
          display: flex;
          flex-direction: column;
          text-align: center;
          padding: 1rem;
          background: var(--background-secondary);
          border-radius: var(--radius-md);
        }
        
        .month-label {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }
        
        .month-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
        }
        
        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
        
        @media (max-width: 640px) {
          .month-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
