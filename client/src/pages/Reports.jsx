import { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';
import { useToast } from '../components/Toast/Toast';
import { TableSkeleton, SkeletonStatCard } from '../components/Skeleton/Skeleton';
import DateRangePicker from '../components/DateRangePicker/DateRangePicker';
import ExportButton from '../components/ExportButton/ExportButton';
import { BarChart3, TrendingUp, Package, AlertTriangle, Pill, RefreshCw } from 'lucide-react';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales');
  const [salesReport, setSalesReport] = useState([]);
  const [topMedicines, setTopMedicines] = useState([]);
  const [inventoryReport, setInventoryReport] = useState(null);
  const [expiryReport, setExpiryReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const toast = useToast();

  useEffect(() => { fetchReports(); }, [dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [salesRes, topRes, invRes, expRes] = await Promise.all([
        reportsAPI.getSales({ group_by: 'day', start_date: dateRange.startDate, end_date: dateRange.endDate }),
        reportsAPI.getTopMedicines({ limit: 10, start_date: dateRange.startDate, end_date: dateRange.endDate }),
        reportsAPI.getInventory(),
        reportsAPI.getExpiry({ days: 60 })
      ]);
      setSalesReport(salesRes.data?.daily_sales || salesRes.data || []);
      setTopMedicines(topRes.data || []);
      setInventoryReport(invRes.data);
      setExpiryReport(expRes.data);
    } catch (error) { 
      toast.error('Failed to fetch reports');
    }
    finally { setLoading(false); }
  };

  const handleDateChange = (newRange) => {
    setDateRange(newRange);
    toast.info(`Showing data from ${newRange.startDate} to ${newRange.endDate}`);
  };

  const salesExportColumns = [
    { key: 'period', label: 'Date' },
    { key: 'total_sales', label: 'Sales Count' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'total_discounts', label: 'Discounts' }
  ];

  const topMedsExportColumns = [
    { key: 'name', label: 'Medicine' },
    { key: 'medicine_code', label: 'Code' },
    { key: 'total_sold', label: 'Units Sold' },
    { key: 'total_revenue', label: 'Revenue' }
  ];

  return (
    <div>
      <div className="page-header">
        <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
          {['sales', 'top-medicines', 'inventory', 'expiry'].map(tab => (
            <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab(tab)}>
              {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>
        <div className="flex gap-sm">
          {(activeTab === 'sales' || activeTab === 'top-medicines') && (
            <DateRangePicker 
              startDate={dateRange.startDate} 
              endDate={dateRange.endDate} 
              onChange={handleDateChange}
            />
          )}
          {activeTab === 'sales' && <ExportButton data={salesReport} filename="sales_report" columns={salesExportColumns} />}
          {activeTab === 'top-medicines' && <ExportButton data={topMedicines} filename="top_medicines" columns={topMedsExportColumns} />}
          <button className="btn btn-ghost" onClick={fetchReports} title="Refresh">
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {activeTab === 'sales' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><TrendingUp size={20} /> Sales Report</h3>
          </div>
          {loading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : (
            <div className="table-container" style={{border: 'none'}}>
              <table className="table">
                <thead><tr><th>Date</th><th>Sales Count</th><th>Revenue</th><th>Discounts</th></tr></thead>
                <tbody>
                  {salesReport.length === 0 ? (
                    <tr><td colSpan="4" className="text-center text-muted" style={{padding: '2rem'}}>No sales data for selected period</td></tr>
                  ) : salesReport.slice(0, 30).map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.period}</td>
                      <td>{row.total_sales}</td>
                      <td><strong>₹{parseFloat(row.revenue || 0).toLocaleString()}</strong></td>
                      <td>₹{parseFloat(row.total_discounts || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'top-medicines' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Pill size={20} /> Top Selling Medicines</h3>
          </div>
          {loading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : (
            <div className="table-container" style={{border: 'none'}}>
              <table className="table">
                <thead><tr><th>#</th><th>Medicine</th><th>Code</th><th>Units Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  {topMedicines.length === 0 ? (
                    <tr><td colSpan="5" className="text-center text-muted" style={{padding: '2rem'}}>No data</td></tr>
                  ) : topMedicines.map((med, idx) => (
                    <tr key={med.id}>
                      <td><span className="badge badge-primary">{idx + 1}</span></td>
                      <td><strong>{med.name}</strong></td>
                      <td>{med.medicine_code}</td>
                      <td>{med.total_sold}</td>
                      <td>₹{parseFloat(med.total_revenue || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'inventory' && (
        <div>
          {loading ? (
            <div className="stats-grid" style={{marginBottom: '1.5rem'}}>
              {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
            </div>
          ) : inventoryReport && (
            <div className="stats-grid" style={{marginBottom: '1.5rem'}}>
              <div className="stat-card">
                <div className="stat-icon blue"><Package size={24} /></div>
                <div className="stat-content"><h3>{inventoryReport.summary?.total_items || 0}</h3><p>Total Items</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange"><AlertTriangle size={24} /></div>
                <div className="stat-content"><h3>{inventoryReport.summary?.low_stock || 0}</h3><p>Low Stock</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red"><Package size={24} /></div>
                <div className="stat-content"><h3>{inventoryReport.summary?.out_of_stock || 0}</h3><p>Out of Stock</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green"><BarChart3 size={24} /></div>
                <div className="stat-content"><h3>₹{(inventoryReport.summary?.total_value || 0).toLocaleString()}</h3><p>Total Value</p></div>
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-header"><h3 className="card-title">Stock Levels</h3></div>
            {loading ? (
              <TableSkeleton rows={5} columns={5} />
            ) : (
              <div className="table-container" style={{border: 'none'}}>
                <table className="table">
                  <thead><tr><th>Medicine</th><th>Category</th><th>Stock</th><th>Reorder Level</th><th>Status</th></tr></thead>
                  <tbody>
                    {inventoryReport?.medicines?.slice(0, 50).map(med => (
                      <tr key={med.id}>
                        <td><strong>{med.name}</strong></td>
                        <td>{med.category_name || '-'}</td>
                        <td>{med.current_stock}</td>
                        <td>{med.reorder_level}</td>
                        <td>
                          <span className={`badge ${med.current_stock === 0 ? 'badge-error' : med.current_stock <= med.reorder_level ? 'badge-warning' : 'badge-success'}`}>
                            {med.current_stock === 0 ? 'Out of Stock' : med.current_stock <= med.reorder_level ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'expiry' && (
        <div>
          {loading ? (
            <div className="stats-grid" style={{marginBottom: '1.5rem'}}>
              {Array.from({ length: 2 }).map((_, i) => <SkeletonStatCard key={i} />)}
            </div>
          ) : expiryReport && (
            <div className="stats-grid" style={{marginBottom: '1.5rem'}}>
              <div className="stat-card">
                <div className="stat-icon red"><AlertTriangle size={24} /></div>
                <div className="stat-content"><h3>{expiryReport.expired_count || 0}</h3><p>Expired Items</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange"><AlertTriangle size={24} /></div>
                <div className="stat-content"><h3>{expiryReport.expiring_count || 0}</h3><p>Expiring Soon</p></div>
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-header"><h3 className="card-title">Expiry Details</h3></div>
            {loading ? (
              <TableSkeleton rows={5} columns={5} />
            ) : (
              <div className="table-container" style={{border: 'none'}}>
                <table className="table">
                  <thead><tr><th>Medicine</th><th>Batch</th><th>Quantity</th><th>Expiry Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {[...(expiryReport?.expired || []), ...(expiryReport?.expiring_soon || [])].map((item, idx) => (
                      <tr key={idx} style={item.days_until_expiry < 0 ? {background: 'var(--error-bg)'} : {}}>
                        <td><strong>{item.medicine_name}</strong></td>
                        <td>{item.batch_number}</td>
                        <td>{item.remaining_quantity}</td>
                        <td>{new Date(item.expiry_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${item.days_until_expiry < 0 ? 'badge-error' : 'badge-warning'}`}>
                            {item.days_until_expiry < 0 ? 'Expired' : `${item.days_until_expiry} days`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
