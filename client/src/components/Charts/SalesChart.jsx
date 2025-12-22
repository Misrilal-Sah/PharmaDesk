import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

export default function SalesChart({ data = [], height = 300 }) {
  // Format data if needed - API returns: period, total_sales, revenue, total_discounts
  const chartData = data.map(item => ({
    date: item.period || item.date || item.sale_date,
    sales: parseFloat(item.revenue || item.total_sales || item.amount || 0),
    orders: parseInt(item.total_sales || item.order_count || item.count || 0)
  }));

  const formatCurrency = (value) => `₹${value.toLocaleString()}`;
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  if (chartData.length === 0) {
    return (
      <div className="chart-empty">
        <p>No sales data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis 
          dataKey="date" 
          tickFormatter={formatDate}
          stroke="var(--text-muted)"
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
        />
        <YAxis 
          tickFormatter={formatCurrency}
          stroke="var(--text-muted)"
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-md)'
          }}
          labelFormatter={formatDate}
          formatter={(value, name) => [
            name === 'sales' ? formatCurrency(value) : value,
            name === 'sales' ? 'Revenue' : 'Orders'
          ]}
        />
        <Legend />
        <Area 
          type="monotone" 
          dataKey="sales" 
          stroke="var(--primary)" 
          fill="url(#salesGradient)"
          strokeWidth={2}
          name="Revenue"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
