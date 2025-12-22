import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

const COLORS = ['#1565C0', '#00BFA5', '#FF9800', '#E91E63', '#9C27B0'];

export default function TopMedicinesChart({ data = [], height = 300, showValue = 'quantity' }) {
  // Limit to top 5 and format data
  const chartData = data.slice(0, 5).map((item, index) => ({
    name: item.name?.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
    fullName: item.name,
    value: showValue === 'quantity' ? parseInt(item.total_sold || item.quantity || 0) 
           : parseFloat(item.total_revenue || item.revenue || 0),
    color: COLORS[index % COLORS.length]
  }));

  const formatValue = (value) => {
    if (showValue === 'revenue') return `₹${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  if (chartData.length === 0) {
    return (
      <div className="chart-empty">
        <p>No medicine sales data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart 
        data={chartData} 
        layout="vertical" 
        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis 
          type="number" 
          tickFormatter={formatValue}
          stroke="var(--text-muted)"
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
        />
        <YAxis 
          type="category" 
          dataKey="name" 
          stroke="var(--text-muted)"
          tick={{ fill: 'var(--text-primary)', fontSize: 12 }}
          width={80}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-md)'
          }}
          formatter={(value) => [formatValue(value), showValue === 'quantity' ? 'Units Sold' : 'Revenue']}
          labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
